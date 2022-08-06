const request = require('request');
const fs = require('fs');
const { Octokit } = require("@octokit/core");
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function updateV8(version, lastVersion) {
  console.log(`Update v8 from ${lastVersion} to ${version}`);
  const date = (new Date()).toISOString().split('T')[0].replace(/-/g, '');
  for (const type of [ 'static', 'dynamic' ]) {
    const action = {
      owner: 'Geequlim',
      repo: 'v8-builder',
      workflow_id: 'build.yml',
      ref: 'main',
      inputs: {
        type,
        version,
        tag: `nightly-${date}`
      }
    };
    try {
      await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', action);
      console.log('Start build action: ');
    } catch (error) {
      console.error("Request build action failed: ", error);
    }
    console.log(JSON.stringify(action, undefined, '  '));
  }
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
    const lastVersion = fs.readFileSync(versionFile, 'utf-8');
    if (lastVersion != v8_version) {
      fs.writeFileSync(versionFile, v8_version, 'utf-8');
      updateV8(v8_version, lastVersion);
    }
});
