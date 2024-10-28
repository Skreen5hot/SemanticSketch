function loadTool(htmlFile, jsFile) {
    fetch(htmlFile)
        .then(response => response.text())
        .then(data => {
            document.getElementById('dynamic-tool').innerHTML = data;

            let script = document.createElement('script');
            script.src = jsFile;
            script.onload = () => {
                if (typeof window.refreshFileUI === 'function') {
                    window.refreshFileUI();
                }
            };
            document.body.appendChild(script);
        })
        .catch(error => console.error('Error loading the tool:', error));
}

// SPARQL Query Tool Functions
function openSPARQLFile() {
    const selectedFile = document.getElementById('sparql-file-selector').value;
    const fileContent = loadFromIndexedDB(selectedFile); // Implement loading logic from IndexedDB
    document.getElementById('sparqlQuery').value = fileContent;
}

function runSPARQLQuery() {
    const query = document.getElementById('sparqlQuery').value;
    const selectedFile = document.getElementById('sparql-file-selector').value;

    const rdfData = loadFromIndexedDB(selectedFile); // Implement loading logic from IndexedDB
    const store = $rdf.graph();
    const baseIRI = 'http://example.org/';
    const contentType = 'text/turtle';

    $rdf.parse(rdfData, store, baseIRI, contentType);

    const results = $rdf.query(query, store);
    const resultString = results.map(result => JSON.stringify(result)).join('\n');
    document.getElementById('sparqlResults').value = resultString;
}

// Implement logic to load files from IndexedDB and update the file selector
function loadFromIndexedDB(filename) {
    // Add your IndexedDB retrieval logic here
    // For demonstration purposes, returning an example RDF string
    return `@prefix ex: <http://example.org/> .
ex:subject ex:predicate ex:object.`;
}
