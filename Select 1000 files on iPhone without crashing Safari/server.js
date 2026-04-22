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
        #clear-btn {
            background-color: #6c757d;
            margin-top: 10px;
        }
        #file-count {
            font-weight: bold;
            margin-bottom: 10px;
            color: #007bff;
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
    <p>Optimized for uploading many files on Safari/iPhone.</p>

    <div class="info">
        Files are accumulated in a list before being uploaded in a single batch.
    </div>

    <div class="form-group">
        <label for="url">Target Upload URL</label>
        <input type="url" id="url" placeholder="http://192.168.1.x:xxxx/upload" value="">
    </div>

    <div class="form-group">
        <label for="folder">Select Folder</label>
        <div id="file-count">0 files selected</div>
        <input type="file" id="folder" webkitdirectory directory multiple>
    </div>

    <button id="upload-btn">Start Upload</button>
    <button id="clear-btn">Clear Selection</button>

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
        const folderInput = document.getElementById('folder');
        const uploadBtn = document.getElementById('upload-btn');
        const progressContainer = document.getElementById('progress-container');
        const overallProgress = document.getElementById('overall-progress');
        const overallLabel = document.getElementById('overall-label');
        const fileProgress = document.getElementById('file-progress');
        const fileLabel = document.getElementById('file-label');
        const status = document.getElementById('status');
        const log = document.getElementById('log');
        const clearBtn = document.getElementById('clear-btn');
        const fileCountDisplay = document.getElementById('file-count');

        let filesToUpload = [];

        function addLog(message) {
            const entry = document.createElement('div');
            entry.textContent = "[" + new Date().toLocaleTimeString() + "] " + message;
            log.prepend(entry);
        }

        function updateUI() {
            fileCountDisplay.textContent = filesToUpload.length + " files selected";
            overallLabel.textContent = "Overall Progress (0/" + filesToUpload.length + ")";
        }

        function setLoading(loading) {
            uploadBtn.disabled = loading;
            clearBtn.disabled = loading;
            folderInput.disabled = loading;
            urlInput.disabled = loading;
        }

        clearBtn.addEventListener('click', () => {
            filesToUpload = [];
            folderInput.value = '';
            updateUI();
            addLog("Selection cleared.");
        });

        folderInput.addEventListener('change', () => {
            const newFiles = Array.from(folderInput.files);
            if (newFiles.length > 0) {
                filesToUpload = filesToUpload.concat(newFiles);
                // Clear the input value immediately after copying to a JS array.
                // This helps Safari release UI resources associated with large file lists.
                folderInput.value = '';
                updateUI();
                addLog("Added " + newFiles.length + " files. Total: " + filesToUpload.length);
            }
        });

        uploadBtn.addEventListener('click', () => {
            const url = urlInput.value;
            if (!url) {
                alert('Please enter a target URL');
                return;
            }

            if (filesToUpload.length === 0) {
                alert('Please select files first');
                return;
            }

            setLoading(true);
            progressContainer.style.display = 'block';
            log.innerHTML = '';

            addLog("Starting batch upload of " + filesToUpload.length + " files...");
            status.textContent = "Batch uploading " + filesToUpload.length + " files...";

            const formData = new FormData();
            filesToUpload.forEach((file) => {
                const fileName = file.webkitRelativePath || file.name;
                formData.append('file', file, fileName);
            });

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    fileProgress.style.width = percentComplete + '%';
                    overallProgress.style.width = percentComplete + '%';
                    overallLabel.textContent = "Overall Progress (" + Math.round(percentComplete) + "%)";
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    addLog("Batch upload successful.");
                    status.textContent = 'Upload complete!';
                    overallProgress.style.width = '100%';
                    fileProgress.style.width = '100%';
                    overallLabel.textContent = "Overall Progress (100%)";
                    setLoading(false);
                } else {
                    addLog("Error during batch upload: Status " + xhr.status + " (" + xhr.statusText + "), ReadyState " + xhr.readyState);
                    status.textContent = "Batch upload failed.";
                    setLoading(false);
                }
            };

            xhr.onerror = () => {
                addLog("Network error during batch upload. Status: " + xhr.status + ", ReadyState: " + xhr.readyState);
                status.textContent = "Network error. Stopped.";
                setLoading(false);
            };

            xhr.send(formData);
        });
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const pathname = req.url.split('?')[0];
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/' || pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML);
    } else if (req.method === 'POST' && pathname === '/upload') {
        // Stream the request body to avoid buffering it in memory
        req.on('data', (chunk) => {
            // Consume the stream without storing it
        }).on('end', () => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({ success: true }));
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
