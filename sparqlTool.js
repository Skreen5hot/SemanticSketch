//11-1-2024  7:36am
let store = new N3.Store();
const DEBUG = true; // Set to true for debugging

function log(message) {
    if (DEBUG) {
        console.log(message);
    }
    document.getElementById('results').innerHTML += message + '<br>';
}

async function loadRDFContent(content, format = 'Turtle') {
    // Parse RDF content using the N3 library and populate the store
    const parser = new N3.Parser({ format: format });
    let quadCount = 0; // Initialize a counter for quads

    parser.parse(content, (error, quad, prefixes) => {
        if (error) {
            log('Error parsing RDF content: ' + error);
        } else if (quad) {
            store.addQuad(quad);
            quadCount++; // Increment the counter for each added quad
        } else {
            log('File loaded successfully. Triples count: ' + store.size + ', Quads added: ' + quadCount);
        }
    });

    // Check the store size after parsing
    log('Current store size after loading: ' + store.size);
}


// Existing function to load file content from IndexedDB
async function loadFileFromIndexDB(fileName) {
    const content = await loadFileFromList(fileName);
    if (content) {
        document.getElementById('rdfInput').value = content;
        log(`Loaded content into textarea: ${content.slice(0, 100)}...`);
        await loadRDFContent(content); // Ensure the RDF is fully loaded first
        executeQuery(); // Call executeQuery only after RDF content is loaded
    } else {
        log('Failed to load file from IndexedDB. Check if the file exists in the database.');
    }
}

async function executeQuery() {
    const queryEngine = new Comunica.QueryEngine();
    let query = document.getElementById('queryInput').value.trim();

    // Optimize query transformation
    query = query.replace(/\ba\s/g, 'rdf:type ')
                 .replace(/(\bhttp:\/\/[^\s<>]+)(?=\s)/g, '<$1>')
                 .replace(/\b(\w+:\w+)\b(?!>)/g, '<$1>');

    log('Starting query execution...');
    log('Query: ' + query);
    log('Store size: ' + store.size);

    try {
        const result = await queryEngine.query(query, { sources: [store] });

        if (result.resultType === 'bindings') {
            const bindingsStream = await result.execute();

            let tableHTML = '<table border="1"><thead><tr>';
            const headers = [];
            let count = 0;

            bindingsStream.on('data', (binding) => {
                count++;
                if (count === 1) {
                    for (const [key] of binding.entries) {
                        headers.push(key);
                        tableHTML += `<th>${key}</th>`;
                    }
                    tableHTML += '</tr></thead><tbody>';
                }

                tableHTML += '<tr>';
                for (const [key, value] of binding.entries) {
                    tableHTML += `<td>${value.value}</td>`;
                }
                tableHTML += '</tr>';
            });

            bindingsStream.on('end', () => {
                tableHTML += '</tbody></table>';
                log(`Processed ${count} bindings.`);
                document.getElementById('results').innerHTML = tableHTML;
                log('Query execution completed.');
            });

            bindingsStream.on('error', (error) => {
                log('Error processing bindings: ' + error);
            });
        } else {
            log('Unsupported result type: ' + result.resultType);
        }
    } catch (error) {
        log('Error executing query: ' + error);
        document.getElementById('results').textContent = 'Error: ' + error.message;
    }
}
