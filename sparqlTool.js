// Assume RDF store is created globally
let rdfStore = $rdf.graph(); // Using rdflib.js to create a graph

function detectRDFFormat(rdfData) {
    // Basic checks for common RDF formats
    if (rdfData.startsWith('<')) {
        return 'RDF/XML'; // Indicates RDF/XML format
    } else if (rdfData.includes('@prefix')) {
        return 'Turtle'; // Indicates Turtle format
    } else if (rdfData.trim().startsWith('{')) {
        return 'JSON-LD'; // Indicates JSON-LD format
    } else if (rdfData.includes('http://') || rdfData.includes('https://')) {
        return 'N-Triples'; // Potential N-Triples format based on URIs
    } else {
        return 'unknown'; // Format could not be determined
    }
}

function runSPARQLQuery() {
    const rdfInput = document.getElementById("rdfInput").value;
    const sparqlQuery = document.getElementById("sparqlQuery").value;

    // Detect RDF format and parse the input
    const format = detectRDFFormat(rdfInput);
    console.log("Detected RDF format:", format);

    // Parse the RDF input and populate the RDF store
    try {
        if (format === 'Turtle') {
            parseTurtle(rdfInput);
        } else if (format === 'N-Triples') {
            parseNTriples(rdfInput);
        } else if (format === 'RDF/XML') {
            parseRDFXML(rdfInput);
        } else {
            console.error("Unsupported RDF format detected:", format);
            console.error("Input RDF Data: ", rdfInput); // Log the input data
            document.getElementById("sparqlResults").value = "Unsupported RDF format: " + format;
            return;
        }

        // Run the SPARQL query
        executeSPARQL(sparqlQuery);
    } catch (error) {
        console.error("Error during RDF processing:", error);
        document.getElementById("sparqlResults").value = "Error processing RDF input: " + error.message;
    }
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
        throw new Error("Parsing Turtle RDF failed.");
    }
}

// Function to parse RDF/XML data and populate the RDF store
function parseRDFXML(rdfInput) {
    const contentType = 'application/rdf+xml'; // Set correct content type for RDF/XML
    const baseIRI = 'http://example.org/';

    try {
        $rdf.parse(rdfInput, rdfStore, baseIRI, contentType);
        console.log("Parsed RDF/XML input successfully.");
    } catch (error) {
        console.error("Error parsing RDF/XML:", error);
        throw new Error("Parsing RDF/XML failed.");
    }
}

// Function to parse N-Triples data and populate the RDF store
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

document.addEventListener('DOMContentLoaded', () => {
    refreshFileUI(); // Ensure this is called after the page is fully loaded
});
