const request = require('request');
const fs = require('fs');
const child_process = require('child_process');

async function updateV8(version) {
  child_process.execSync(`echo "NEW_VERSION=${version}" >> $GITHUB_ENV`, { stdio: 'inherit' });
}

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
      console.log(`Update v8 from ${lastVersion} to ${v8_version}`);
      fs.writeFileSync(versionFile, v8_version, 'utf-8');
      updateV8(v8_version);
    }
});
