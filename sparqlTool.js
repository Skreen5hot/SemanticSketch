const store = $rdf.graph();

function loadTurtleFile() {
    const fileSelect = document.getElementById("sparql-file-select");
    const file = fileSelect.value;
    if (!file) {
        alert("Please select a Turtle file to load.");
        return;
    }

    // Open IndexedDB and fetch the file content
    const request = indexedDB.open("MyDatabaseName", 1);
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create the object store if it doesn't exist
        if (!db.objectStoreNames.contains("MyObjectStoreName")) {
            db.createObjectStore("MyObjectStoreName", { keyPath: "id" }); // Adjust keyPath as necessary
        }
    };

    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["MyObjectStoreName"], "readonly");
        const objectStore = transaction.objectStore("MyObjectStoreName");
        const getRequest = objectStore.get(file);

        getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data) {
                // Parse Turtle data
                $rdf.parse(data.content, store, 'http://example.org/', 'text/turtle');
                alert("File loaded successfully.");
            } else {
                alert("File not found in IndexedDB.");
            }
        };

        getRequest.onerror = () => {
            console.error("Error retrieving file from IndexedDB");
        };
    };

    request.onerror = () => {
        console.error("Error opening IndexedDB.");
    };
}

function runSparqlQuery() {
    const queryText = document.getElementById("sparqlQuery").value;
    if (!queryText) {
        alert("Please enter a SPARQL query.");
        return;
    }

    try {
        const query = $rdf.SPARQLToQuery(queryText, false, store);
        const results = [];

        store.query(query, (result) => {
            results.push(result);
        });

        // Display results in JSON format for simplicity
        document.getElementById("sparqlResults").textContent = JSON.stringify(results, null, 2);
    } catch (error) {
        console.error("Error running SPARQL query:", error);
        alert("There was an error running the SPARQL query. Check the console for details.");
    }
}

// Populate the select menu with files from IndexedDB or other storage
function populateFileSelect() {
    const fileSelect = document.getElementById("sparql-file-select");
    // Assume files are available in IndexedDB or an array of filenames
    const request = indexedDB.open("MyDatabaseName", 1);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["MyObjectStoreName"], "readonly");
        const objectStore = transaction.objectStore("MyObjectStoreName");
        const allFilesRequest = objectStore.getAll(); // Fetch all files

        allFilesRequest.onsuccess = () => {
            const files = allFilesRequest.result;
            files.forEach(file => {
                const option = document.createElement("option");
                option.value = file.id; // Assuming each file has an 'id' property
                option.textContent = file.id; // Adjust based on your data structure
                fileSelect.appendChild(option);
            });
        };

        allFilesRequest.onerror = () => {
            console.error("Error retrieving files from IndexedDB");
        };
    };

    request.onerror = () => {
        console.error("Error opening IndexedDB.");
    };
}

document.addEventListener("DOMContentLoaded", populateFileSelect);
