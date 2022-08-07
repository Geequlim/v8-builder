const request = require('request');
const fs = require('fs');
const { Octokit } = require("@octokit/core");
const octokit = new Octokit({ auth: process.env.REPOSITORY_TOKEN });


async function updateV8(version) {
  const workflows = ['android.yml', 'ios.yml', 'linux.yml', 'macos.yml', 'windows.yml'];
  for (const workflow of workflows) {
    const options = {
      owner: 'Geequlim',
      repo: 'v8-builder',
      workflow_id: workflow,
      ref: 'main',
      inputs: { version }
    };
    try {
      console.log('Start workflow', options.workflow_id);
      await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', options);
    } catch (error) {
      console.error(error);
    }
    console.log(JSON.stringify(options, undefined, '  '));
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
    const lastVersion = fs.readFileSync(versionFile, 'utf-8').trim();
    if (lastVersion != v8_version) {
      console.log(`Update v8 from ${lastVersion} to ${v8_version}`);
      fs.writeFileSync(versionFile, v8_version, 'utf-8');
    }
});
