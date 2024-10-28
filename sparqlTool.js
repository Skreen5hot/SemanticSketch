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

function executeSparqlQuery() {
    const query = document.getElementById('sparqlQuery').value;
    const resultsArea = document.getElementById('queryResults');
    
    // Open IndexedDB and retrieve RDF data
    const request = indexedDB.open("rdfDatabase", 1);
    
    request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(["rdfData"], "readonly");
        const store = transaction.objectStore("rdfData");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = function(event) {
            const rdfData = event.target.result;
            const store = $rdf.graph();
            
            // Add RDF data to the rdflib store
            rdfData.forEach(item => {
                $rdf.parse(item.data, store, item.uri, item.type);
            });

            // Execute the SPARQL query
            const results = $rdf.SPARQLToJSON($rdf.SPARQLQuery(store, query));

            // Format and display results
            if (results.length > 0) {
                resultsArea.value = JSON.stringify(results, null, 2);
            } else {
                resultsArea.value = "No results found.";
            }
        };
        
        getAllRequest.onerror = function(event) {
            resultsArea.value = "Error retrieving data from IndexedDB.";
        };
    };
    
    request.onerror = function(event) {
        resultsArea.value = "Error opening IndexedDB.";
    };
}
