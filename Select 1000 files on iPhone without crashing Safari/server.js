const http = require('http');

const PORT = process.env.PORT || 3000;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Optimized Safari File Upload</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.6;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"], input[type="url"] {
            width: 100%;
            padding: 12px;
            box-sizing: border-box;
            border: 1px solid #ccc;
            border-radius: 8px;
            font-size: 16px;
        }
        input[type="file"] {
            width: 100%;
            padding: 10px 0;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px;
            width: 100%;
            font-weight: bold;
        }
        button:disabled {
            background-color: #ccc;
        }
        #progress-container {
            margin-top: 30px;
            display: none;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        .progress-bar {
            width: 100%;
            background-color: #eee;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
            height: 20px;
        }
        .progress-fill {
            height: 100%;
            background-color: #28a745;
            width: 0%;
            transition: width 0.1s;
        }
        #status {
            font-size: 0.95em;
            color: #333;
            margin-top: 10px;
            word-break: break-all;
            font-weight: 500;
        }
        #log {
            margin-top: 20px;
            max-height: 150px;
            overflow-y: auto;
            border: 1px solid #eee;
            padding: 10px;
            font-family: monospace;
            font-size: 0.75em;
            background: #f9f9f9;
            border-radius: 4px;
        }
        .info {
            background-color: #e7f3ff;
            padding: 10px;
            border-radius: 8px;
            font-size: 0.9em;
            margin-bottom: 20px;
            color: #004085;
        }
    </style>
</head>
<body>
    <h1>Folder Upload</h1>
    <p>Optimized for uploading many files on Safari/iPhone by processing them sequentially.</p>

    <div class="info">
        Files are uploaded one by one to prevent Safari from hanging or crashing.
    </div>

    <div class="form-group">
        <label for="url">Target Upload URL</label>
        <input type="url" id="url" placeholder="http://192.168.1.x:xxxx/upload" value="">
    </div>

    <div class="form-group">
        <label>Upload Mode</label>
        <div style="display: flex; gap: 20px; margin-top: 5px;">
            <label style="font-weight: normal; display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="upload-mode" value="sequential" checked> Sequential
            </label>
            <label style="font-weight: normal; display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="upload-mode" value="batch"> Batch
            </label>
        </div>
    </div>

    <div class="form-group">
        <label for="folder">Select Folder</label>
        <input type="file" id="folder" webkitdirectory directory multiple>
    </div>

    <button id="upload-btn">Start Upload</button>

    <div id="progress-container">
        <label id="overall-label">Overall Progress (0/0)</label>
        <div class="progress-bar">
            <div id="overall-progress" class="progress-fill"></div>
        </div>

        <label id="file-label">Current File Progress</label>
        <div class="progress-bar">
            <div id="file-progress" class="progress-fill"></div>
        </div>

        <div id="status">Ready</div>
        <div id="log"></div>
    </div>

    <script>
        const urlInput = document.getElementById('url');
        urlInput.value = window.location.origin + '/upload';
        const folderInput = document.getElementById('folder');
        const uploadBtn = document.getElementById('upload-btn');
        const progressContainer = document.getElementById('progress-container');
        const overallProgress = document.getElementById('overall-progress');
        const overallLabel = document.getElementById('overall-label');
        const fileProgress = document.getElementById('file-progress');
        const fileLabel = document.getElementById('file-label');
        const status = document.getElementById('status');
        const log = document.getElementById('log');

        let filesToUpload = [];
        let currentFileIndex = 0;

        folderInput.addEventListener('change', () => {
            filesToUpload = Array.from(folderInput.files);
            addLog("Selected " + filesToUpload.length + " files. Clearing input to save memory.");
            // Clearing the input helps Safari handle large number of files
            folderInput.value = '';
            status.textContent = filesToUpload.length + " files selected.";
            progressContainer.style.display = 'block';
        });

        function addLog(message) {
            const entry = document.createElement('div');
            entry.textContent = "[" + new Date().toLocaleTimeString() + "] " + message;
            log.prepend(entry);
        }

        uploadBtn.addEventListener('click', () => {
            const url = urlInput.value;
            if (!url) {
                alert('Please enter a target URL');
                return;
            }

            if (filesToUpload.length === 0) {
                alert('Please select a folder with files');
                return;
            }

            const mode = document.querySelector('input[name="upload-mode"]:checked').value;

            uploadBtn.disabled = true;
            folderInput.disabled = true;
            urlInput.disabled = true;
            progressContainer.style.display = 'block';
            currentFileIndex = 0;

            log.innerHTML = '';
            addLog("Starting " + mode + " upload of " + filesToUpload.length + " files...");

            if (mode === 'batch') {
                uploadBatch();
            } else {
                uploadNextFile();
            }
        });

        function uploadBatch() {
            const url = urlInput.value;
            status.textContent = "Uploading " + filesToUpload.length + " files in one batch...";
            overallLabel.textContent = "Overall Progress (0/" + filesToUpload.length + ")";
            fileLabel.textContent = "Batch Progress";

            const formData = new FormData();
            for (const file of filesToUpload) {
                const fileName = file.webkitRelativePath || file.name;
                formData.append('file', file, fileName);
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    overallProgress.style.width = percentComplete + '%';
                    fileProgress.style.width = percentComplete + '%';
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    addLog("Batch upload successful.");
                    status.textContent = 'Upload complete!';
                    overallLabel.textContent = "Overall Progress (" + filesToUpload.length + "/" + filesToUpload.length + ")";
                    overallProgress.style.width = '100%';
                    fileProgress.style.width = '100%';
                    uploadBtn.disabled = false;
                    folderInput.disabled = false;
                    urlInput.disabled = false;
                    filesToUpload = []; // Clear after success
                } else {
                    let errorMsg = "Batch upload error: " + xhr.status + " " + xhr.statusText;
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.error) errorMsg += " - " + response.error;
                    } catch(e) {}
                    addLog(errorMsg);
                    status.textContent = "Error during batch upload. Stopped.";
                    uploadBtn.disabled = false;
                    folderInput.disabled = false;
                    urlInput.disabled = false;
                }
            };

            xhr.onerror = () => {
                addLog("Network error during batch upload.");
                status.textContent = "Network error. Stopped.";
                uploadBtn.disabled = false;
                folderInput.disabled = false;
                urlInput.disabled = false;
            };

            xhr.send(formData);
        }

        function uploadNextFile() {
            if (currentFileIndex >= filesToUpload.length) {
                status.textContent = 'Upload complete!';
                overallLabel.textContent = "Overall Progress (" + filesToUpload.length + "/" + filesToUpload.length + ")";
                addLog('All files uploaded successfully.');
                uploadBtn.disabled = false;
                folderInput.disabled = false;
                urlInput.disabled = false;
                return;
            }

            const file = filesToUpload[currentFileIndex];
            const url = urlInput.value;

            const fileName = file.webkitRelativePath || file.name;
            status.textContent = "Uploading (" + (currentFileIndex + 1) + "/" + filesToUpload.length + "): " + fileName;
            overallLabel.textContent = "Overall Progress (" + currentFileIndex + "/" + filesToUpload.length + ")";

            const formData = new FormData();
            formData.append('file', file, fileName);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    fileProgress.style.width = percentComplete + '%';
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    addLog("Uploaded: " + file.name);
                    currentFileIndex++;
                    const overallPercent = (currentFileIndex / filesToUpload.length) * 100;
                    overallProgress.style.width = overallPercent + '%';
                    fileProgress.style.width = '0%';
                    uploadNextFile();
                } else {
                    let errorMsg = "Error uploading " + file.name + ": " + xhr.status + " " + xhr.statusText;
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.error) errorMsg += " - " + response.error;
                    } catch(e) {}
                    addLog(errorMsg);
                    status.textContent = "Error at file " + (currentFileIndex + 1) + ". Stopped.";
                    uploadBtn.disabled = false;
                    folderInput.disabled = false;
                    urlInput.disabled = false;
                }
            };

            xhr.onerror = () => {
                addLog("Network error uploading " + file.name);
                status.textContent = "Network error. Stopped.";
                uploadBtn.disabled = false;
                folderInput.disabled = false;
                urlInput.disabled = false;
            };

            xhr.send(formData);
        }
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const pathname = req.url.split('?')[0];
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/' || pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML);
    } else if (req.method === 'POST' && pathname === '/upload') {
        // Stream the request body and discard it to avoid memory issues
        req.on('data', (chunk) => {
            // Processing data in chunks here would be ideal for a real app
        }).on('end', () => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({ success: true }));
        }).on('error', (err) => {
            console.error('Server error during upload:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        });
    } else if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT + '/');
});
