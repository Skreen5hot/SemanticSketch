let store = new N3.Store();
const dbName = "rdfFilesDB";
const storeName = "rdfFiles";
const DEBUG = true;

function log(message) {
    if (DEBUG) console.log(message);
    document.getElementById('results').innerHTML += message + '<br>';
}

// Open IndexedDB and populate the file dropdown
function initIndexedDB() {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(storeName, { keyPath: "fileName" });
    };

    request.onsuccess = (event) => {
        const db = event.target.result;
        populateFileDropdown(db);
    };

    request.onerror = () => {
        log("Failed to open IndexedDB.");
    };
}

function populateFileDropdown(db) {
    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);
    const fileSelect = document.getElementById("fileSelect");

    objectStore.getAll().onsuccess = (event) => {
        const files = event.target.result;
        files.forEach((file) => {
            const option = document.createElement("option");
            option.value = file.fileName;
            option.textContent = file.fileName;
            fileSelect.appendChild(option);
        });
    };
}

// Load selected file content into RDF store
document.getElementById("fileOpenBtn").addEventListener("click", function () {
    const fileName = document.getElementById("fileSelect").value;
    if (!fileName) {
        log("No file selected.");
        return;
    }

    const request = indexedDB.open(dbName);
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(storeName, "readonly");
        const objectStore = transaction.objectStore(storeName);

        const fileRequest = objectStore.get(fileName);
        fileRequest.onsuccess = (event) => {
            const fileData = event.target.result;
            if (fileData) {
                parseWithN3(fileData.content, "Turtle");
            } else {
                log("File not found.");
            }
        };
        fileRequest.onerror = () => {
            log("Failed to retrieve the file.");
        };
    };
});

// Save new RDF file into IndexedDB
document.getElementById("fileSaveBtn").addEventListener("click", function () {
    const fileName = prompt("Enter file name to save:");
    const rdfContent = document.getElementById("rdfInput").value;

    if (!fileName || !rdfContent) {
        log("File name or content is empty.");
        return;
    }

    const request = indexedDB.open(dbName);
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(storeName, "readwrite");
        const objectStore = transaction.objectStore(storeName);

        const fileData = { fileName: fileName, content: rdfContent };
        objectStore.put(fileData);

        log("File saved successfully.");
    };
});

// Parse RDF content using N3 Parser
function parseWithN3(content, format) {
    const parser = new N3.Parser({ format });
    store.clear(); // Clear existing triples

    parser.parse(content, (error, quad) => {
        if (error) {
            log("Error parsing file: " + error);
        } else if (quad) {
            store.addQuad(quad);
        } else {
            log("File loaded successfully. Triples count: " + store.size);
        }
    });
}

// Execute SPARQL query
async function executeQuery() {
    const queryEngine = new Comunica.QueryEngine();
    let query = document.getElementById("queryInput").value.trim();

    log("Starting query execution...");
    log("Query: " + query);
    log("Store size: " + store.size);

    try {
        const result = await queryEngine.query(query, { sources: [store] });
        
        if (result.resultType === "bindings") {
            const bindingsStream = await result.execute();
            let tableHTML = "<table border='1'><thead><tr>";

            bindingsStream.on("data", (binding) => {
                if (!tableHTML.includes("<th>")) {
                    for (const key of binding.keys()) {
                        tableHTML += `<th>${key}</th>`;
                    }
                    tableHTML += "</tr></thead><tbody>";
                }

                tableHTML += "<tr>";
                for (const [key, value] of binding) {
                    tableHTML += `<td>${value.value}</td>`;
                }
                tableHTML += "</tr>";
            });

            bindingsStream.on("end", () => {
                tableHTML += "</tbody></table>";
                document.getElementById("results").innerHTML = tableHTML;
                log("Query execution completed.");
            });

            bindingsStream.on("error", (error) => {
                log("Error processing bindings: " + error);
            });
        } else {
            log("Unsupported result type.");
        }
    } catch (error) {
        log("Error executing query: " + error);
    }
}

// Initialize IndexedDB on page load
window.addEventListener("load", initIndexedDB);
