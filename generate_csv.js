const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runTestAndGetJson(dir) {
    try {
        console.log(`Running tests in ${dir}...`);
        const output = execSync('npx vitest run --reporter=json', { cwd: dir, encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });

        // Find JSON boundaries
        const startIndex = output.indexOf('{');
        const endIndex = output.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) return [];

        const jsonStr = output.substring(startIndex, endIndex + 1);
        const data = JSON.parse(jsonStr);
        return data;
    } catch (err) {
        // Vitest exits with code 1 if tests fail, but still outputs JSON in stdout
        if (err.stdout) {
            const startIndex = err.stdout.indexOf('{');
            const endIndex = err.stdout.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                const jsonStr = err.stdout.substring(startIndex, endIndex + 1);
                try {
                    return JSON.parse(jsonStr);
                } catch (e) {
                    console.error("Failed to parse JSON from error output");
                }
            }
        }
        console.error(`Error running tests in ${dir}:`, err.message);
        return null;
    }
}

function processTestData(data, platform) {
    const rows = [];
    if (data && data.testResults && Array.isArray(data.testResults)) {
        data.testResults.forEach(suite => {
            if (suite.assertionResults) {
                suite.assertionResults.forEach(test => {
                    rows.push({
                        Platform: platform,
                        File: path.basename(suite.name),
                        Suite: test.ancestorTitles ? test.ancestorTitles.join(' > ') : '',
                        Test_Name: test.title,
                        Status: test.status.toUpperCase(),
                        Duration_ms: test.duration || 0,
                        Error: test.failureMessages && test.failureMessages.length > 0 ? test.failureMessages[0].split('\n')[0].replace(/"/g, '""') : ''
                    });
                });
            }
        });
    }
    return rows;
}

function generateCSV() {
    console.log("Generating Test_Results.csv...");
    const backendJson = runTestAndGetJson(path.join(__dirname, 'tests'));
    const frontendJson = runTestAndGetJson(path.join(__dirname, 'frontend/Task-Manager'));

    const backendData = processTestData(backendJson, 'Backend');
    const frontendData = processTestData(frontendJson, 'Frontend');

    const allData = [...backendData, ...frontendData];

    if (allData.length === 0) {
        console.log("No test data found!");
        return;
    }

    const header = ['Platform', 'File', 'Suite', 'Test Name', 'Status', 'Duration (ms)', 'Error Message'];
    const csvContent = [
        header.join(','),
        ...allData.map(row =>
            `"${row.Platform}","${row.File}","${row.Suite}","${row.Test_Name}","${row.Status}","${row.Duration_ms}","${row.Error}"`
        )
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const bom = '\uFEFF';
    fs.writeFileSync(path.join(__dirname, 'Test_Results.csv'), bom + csvContent, 'utf8');

    console.log(`Generated Test_Results.csv with ${allData.length} records!`);
    console.log(`- Backend: ${backendData.length} tests`);
    console.log(`- Frontend: ${frontendData.length} tests`);
}

generateCSV();
