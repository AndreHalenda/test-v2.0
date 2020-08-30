var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
const { resolve } = require('path');
const { rejects } = require('assert');

module.exports.handler = async event => {

  const { q, latitude, longitude } = event.queryStringParameters;

  var instream = fs.createReadStream('data/cities.tsv');
  var outstream = new stream;
  var rl = readline.createInterface(instream, outstream);

  async function getData() {
    return await new Promise((resolve, rejects) =>{
      var suggestions = [];
      var nonRateRes = [];
      rl.on('line', function(line) {
  
        var name = line.split('\t')[1];
        var dLatitude = line.split('\t')[4];
        var dLongitude = line.split('\t')[5];
        var code = line.split('\t')[7];
        var country = line.split('\t')[8];
        var population = line.split('\t')[14];
        var score = 0;

        if (country === 'US' || country === 'CA') {
          if (latitude && longitude) {
            if (population > 5000 && dLatitude === latitude && dLongitude === longitude && name.includes(q)) {
              score = 1
              if (country === 'US') country = 'USA';
              if (country === 'CA') country = 'Canada';
              suggestions.push({
                name: name + ', ' + code + ', ' + country,
                latitude: dLatitude,
                longitude: dLongitude,
                score,
              });
            } else if (population > 5000 && name.includes(q)) {
              if (country === 'US') country = 'USA';
              if (country === 'CA') country = 'Canada';
              nonRateRes.push({
                name: name + ', ' + code + ', ' + country,
                latitude: dLatitude,
                longitude: dLongitude,
                distance: distance(latitude, longitude, dLatitude, dLongitude),
              });
            }
          } else if (!latitude || !longitude) {
            if (population > 5000 && name.includes(q)) {
              if (country === 'US') country = 'USA';
              if (country === 'CA') country = 'Canada';
              nonRateRes.push({
                name: name + ', ' + code + ', ' + country,
                scoreName: name,
              });
            }
          }
        }
          
      });
      rl.on('close', function() {    
        suggestions.push(rate(nonRateRes));
        resolve(suggestions);
      });
    });
  }

  function distance(lat1, lon1, lat2, lon2) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
      return 0;
    }
    else {
      var radlat1 = Math.PI * lat1/180;
      var radlat2 = Math.PI * lat2/180;
      var theta = lon1-lon2;
      var radtheta = Math.PI * theta/180;
      var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      if (dist > 1) {
        dist = 1;
      }
      dist = Math.acos(dist);
      dist = dist * 180/Math.PI;
      dist = dist * 60 * 1.1515 * 1.609344;
      return Math.floor(dist);
    }
  }
  /* I do not know for which formula you are calculating the rating, 
   * so I created my own, which is based on the distance between the coordinates
   */
  function rate (data) {
    if (!data[0].distance) {
      data.sort((a, b) => {
        if (a.scoreName.length > b.scoreName.length) return 1;
        if (a.scoreName.length < b.scoreName.length) return -1;
        return 0;
      });
      var step = data[0].scoreName.length;
      data.forEach(element => {
        if (q === element.scoreName) {
          element.score = 1;
        } else {
          element.score = parseFloat((step / element.scoreName.length).toFixed(1));
          delete element.scoreName; 
        }   
      });
      return data;
    }
    data.sort((a, b) => {
      if (a.distance > b.distance) return 1;
      if (a.distance < b.distance) return -1;
      return 0;
    });
    var step = data[0].distance;
    data.forEach(element => {
      if (data[0] === element) {
        element.score = 0.9;
      } else {
        element.score = parseFloat((step / element.distance).toFixed(1));
      }
      delete element.distance; 
    });
    return data;
  }

  return {
    statusCode: 200,
    body: JSON.stringify(await getData()),
  }

}
