const request = require('request');
const fs = require('fs');

request({
    'method': 'GET',
    'url': 'https://omahaproxy.appspot.com/deps.json',
    'headers': {}
  },
  (error, response) => {
    if (error) {
      console.error(error);
      process.exit(1);
      return;
    }
    const version = JSON.parse(response.body);
    const v8_version = version.v8_version;
    const versionFile = 'v8_version';
    const lastVersion = fs.readFileSync(versionFile, 'utf-8').trim();
    if (lastVersion != v8_version) {
      console.log(`Update v8 from ${lastVersion} to ${version}`);
      fs.writeFileSync(versionFile, v8_version, 'utf-8');
    }
});
