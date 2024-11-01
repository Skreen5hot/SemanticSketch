// Initialize the graph as a global variable
let graph = new rdf.graph();

/**
 * Function to load RDF data into the graph.
 * @param {string} fileContent - The content of the RDF file.
 */
function loadRDFData(fileContent) {
    const mimeType = 'text/turtle'; // Set the MIME type based on file format (e.g., 'application/rdf+xml' for XML)
    console.log('Loading RDF data...');

    rdf.parse(fileContent, graph, 'http://example.org', mimeType, (err, kb) => {
        if (err) {
            console.error('Error loading RDF data:', err);
        } else {
            console.log('RDF data loaded successfully.');
            console.log('Number of triples loaded:', graph.size);
        }
    });
}

/**
 * Function to execute a SPARQL query on the RDF graph.
 */
function executeQuery() {
    const queryInput = document.getElementById('queryInput').value;
    const sparqlQuery = queryInput.trim();

    if (!sparqlQuery) {
        console.error('Query is empty');
        return;
    }

    console.log('Executing query:', sparqlQuery);

    try {
        const query = rdf.SPARQLToQuery(sparqlQuery, true);
        const results = [];

        graph.query(query, (result) => {
            results.push(result);
        });

        console.log('Query execution completed. Number of results:', results.length);
        displayResults(results);
    } catch (error) {
        console.error('Error executing query:', error);
    }
}

/**
 * Function to display query results in the results container.
 * @param {Array} results - The array of results from the SPARQL query.
 */
function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Clear previous results

    if (results.length === 0) {
        console.log('No results found.');
        resultsContainer.innerHTML = '<p>No results found.</p>';
        return;
    }

    console.log('Displaying results...');

    // Create a table for displaying results
    const table = document.createElement('table');
    table.border = 1;
    const headerRow = document.createElement('tr');
    const headers = Object.keys(results[0]);
    
    // Create table headers
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Populate table rows with results
    results.forEach(result => {
        const row = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = result[header] ? result[header].value : '';
            row.appendChild(td);
        });
        table.appendChild(row);
    });

    resultsContainer.appendChild(table);
}

/**
 * Event listener for file input to load selected RDF file.
 */
document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        console.log('File loaded:', file.name);
        loadRDFData(e.target.result);
    };
    reader.readAsText(file);
    console.log('Reading file:', file.name);
});
