// Assume RDF store is created globally
let rdfStore = $rdf.graph(); // Using rdflib.js to create a graph

function runSPARQLQuery() {
    const rdfInput = document.getElementById("rdfInput").value;
    const sparqlQuery = document.getElementById("sparqlQuery").value;

    // Detect RDF format and parse the input
    const format = detectRDFFormat(rdfInput);
    console.log("Detected RDF format:", format);

    // Parse the RDF input and populate the RDF store
    if (format === 'ntriples') {
        parseNTriples(rdfInput);
    } else if (format === 'turtle') {
        parseTurtle(rdfInput);
    } else {
        console.error("Unsupported RDF format detected:", format);
        return;
    }

    // Run the SPARQL query
    executeSPARQL(sparqlQuery);
}

function executeSPARQL(query) {
    try {
        const results = $rdf.query(query, rdfStore);
        displayResults(results);
    } catch (error) {
        console.error("Error executing SPARQL query:", error);
        document.getElementById("sparqlResults").value = "Error executing query: " + error.message;
    }
}

function displayResults(results) {
    let output = "";
    results.forEach(result => {
        output += JSON.stringify(result, null, 2) + "\n"; // Format results as JSON for readability
    });
    document.getElementById("sparqlResults").value = output || "No results found.";
}

// Function to parse Turtle data and populate the RDF store
function parseTurtle(rdfInput) {
    const contentType = 'text/turtle';
    const baseIRI = 'http://example.org/';

    try {
        $rdf.parse(rdfInput, rdfStore, baseIRI, contentType);
        console.log("Parsed Turtle input successfully.");
    } catch (error) {
        console.error("Error parsing Turtle RDF:", error);
    }
}

// Reusing parseNTriples function from rdfToMermaid.js
function parseNTriples(rdfInput) {
    console.log("Parsing N-Triples manually...");
    const lines = rdfInput.trim().split('\n');

    lines.forEach(line => {
        const match = line.match(/<([^>]+)> <([^>]+)> (.+) \./);
        if (match) {
            const subject = match[1];
            const predicate = match[2];
            let object = match[3];

            // Handle literals and URIs differently
            if (object.startsWith('"')) {
                object = object.split('^^')[0].replace(/^"|"$/g, ''); // Remove datatype and quotes
                rdfStore.add($rdf.sym(subject), $rdf.sym(predicate), $rdf.literal(object));
            } else {
                object = object.replace(/^<|>$/g, ''); // Remove angle brackets
                rdfStore.add($rdf.sym(subject), $rdf.sym(predicate), $rdf.sym(object));
            }
        } else {
            console.error("Invalid N-Triples line format:", line);
        }
    });

    console.log("Parsed N-Triples input successfully.");
}

// Initialize Mermaid and other necessary functions
initializeMermaid();

document.addEventListener('DOMContentLoaded', () => {
    refreshFileUI(); // Ensure this is called after the page is fully loaded
});
