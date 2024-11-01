// Load N3 store and Comunica engine
const { DataFactory, Parser, Store } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

// Initialize the Comunica SPARQL engine
const Comunica = window.Comunica;
const comunicaEngine = Comunica.newEngine();

/**
 * Function to load RDF data into the N3 store.
 * @param {string} fileContent - The content of the RDF file.
 */
function loadRDFData(fileContent) {
    const parser = new Parser();
    const store = new Store();

    try {
        const quads = parser.parse(fileContent);
        store.addQuads(quads);
        console.log('RDF data loaded successfully. Number of triples:', store.size);
        window.rdfStore = store; // Store globally for use in queries
    } catch (error) {
        console.error('Error loading RDF data:', error);
    }
}

/**
 * Function to execute a SPARQL query on the RDF store using Comunica.
 */
async function executeQuery() {
    const queryInput = document.getElementById('queryInput').value;
    const sparqlQuery = queryInput.trim();

    if (!sparqlQuery) {
        console.error('Query is empty');
        return;
    }

    console.log('Executing query:', sparqlQuery);

    try {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = ''; // Clear previous results

        if (!window.rdfStore) {
            console.error('RDF store is not initialized.');
            return;
        }

        // Run the query with Comunica
        const result = await comunicaEngine.query(sparqlQuery, {
            sources: [window.rdfStore]
        });

        // Prepare table headers and rows based on the query results
        const table = document.createElement('table');
        table.border = 1;
        const headerRow = document.createElement('tr');
        const variables = result.variables || [];

        // Create table headers
        variables.forEach(variable => {
            const th = document.createElement('th');
            th.textContent = variable.slice(1); // Remove the '?' prefix from variable names
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Fetch and display results
        result.bindingsStream.on('data', (binding) => {
            const row = document.createElement('tr');
            variables.forEach(variable => {
                const td = document.createElement('td');
                const value = binding.get(variable);
                td.textContent = value ? value.value : '';
                row.appendChild(td);
            });
            table.appendChild(row);
        });

        result.bindingsStream.on('end', () => {
            console.log('Query execution completed.');
            resultsContainer.appendChild(table);
        });

        result.bindingsStream.on('error', (error) => {
            console.error('Error while retrieving query results:', error);
        });
    } catch (error) {
        console.error('Error executing query:', error);
    }
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
