module.exports = async ({github, context, core}) => {
    var total_slept = 0;
    var downloaded_files = [];
    var seen_completed_wfs = [];
    var expected_to_see = 1;//['android', 'ios', 'linux', 'macos', 'windows'].length;
    while (total_slept < 10800000 && seen_completed_wfs.length < expected_to_see) {
        var all_workflows = await github.rest.actions.listWorkflowRunsForRepo({
            owner: context.repo.owner,
            repo: context.repo.repo,
        });
        console.log("Expecting to download from " + expected_to_see + " workflows, currently at " + seen_completed_wfs.length + ". Have already downloaded " + downloaded_files.length + " files as " + downloaded_files);
        for (const workflow of all_workflows.data.workflow_runs) {
            if (workflow.head_sha == "${{ github.sha }}") {
                console.log("found " + workflow.name + " " + workflow.status);
                if (workflow.status == "completed") {
                    if (seen_completed_wfs.includes(workflow.name)) {continue;}
                    if (workflow.conclusion == "success") {
                        var artifacts = await github.rest.actions.listWorkflowRunArtifacts({
                            owner: context.repo.owner,
                            repo: context.repo.repo,
                            run_id: workflow.id,
                            per_page: 100,
                        });
                        for (const artifact of artifacts.data.artifacts) {
                            var fn = '${{github.workspace}}/' + artifact.name + '.zip';
                            if (downloaded_files.includes(fn)) {continue;}
                            var download = await github.rest.actions.downloadArtifact({
                                owner: context.repo.owner,
                                repo: context.repo.repo,
                                artifact_id: artifact.id,
                                archive_format: 'zip',
                            });
                            var fs = require('fs');
                            fs.writeFileSync(fn, Buffer.from(download.data));
                            downloaded_files.push(fn);
                        }
                        seen_completed_wfs.push(workflow.name);
                    }
                }
            }
        }
        if (seen_completed_wfs.length < expected_to_see) {
            console.log("sleeping " + 300000);
            await new Promise(r => setTimeout(r, 300000));
            total_slept = total_slept + 300000;
            console.log("done sleeping " + 300000);
        }
    }
    console.log(downloaded_files);
    core.exportVariable('downloaded_files', downloaded_files)
}


