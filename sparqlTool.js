const store = $rdf.graph();

function loadTurtleFile() {
    const fileSelect = document.getElementById("sparql-file-select");
    const file = fileSelect.value;
    if (!file) {
        alert("Please select a Turtle file to load.");
        return;
    }

    // Load the selected Turtle file from IndexedDB or file system (based on your setup)
    // Example: fetch the content and parse it
    fetch(file)
        .then(response => response.text())
        .then(data => {
            // Parse Turtle data
            $rdf.parse(data, store, 'http://example.org/', 'text/turtle');
            alert("File loaded successfully.");
        })
        .catch(error => console.error("Error loading Turtle file:", error));
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
    // Assume files are available in IndexedDB or an array of filenames
    const fileSelect = document.getElementById("sparql-file-select");
    // Example: Populate with dummy file names for demonstration
    const files = ["example1.ttl", "example2.ttl"];
    files.forEach(file => {
        const option = document.createElement("option");
        option.value = file;
        option.textContent = file;
        fileSelect.appendChild(option);
    });
}

document.addEventListener("DOMContentLoaded", populateFileSelect);
