//11-1-2024  7:22am
let store = new N3.Store();
const DEBUG = false;

function log(message) {
    if (DEBUG) {
        console.log(message);
    }
    document.getElementById('results').innerHTML += message + '<br>';
}

async function loadRDFContent(content, format = 'Turtle') {
    // Parse RDF content using the N3 library and populate the store
    const parser = new N3.Parser({ format: format });
    parser.parse(content, (error, quad, prefixes) => {
        if (error) {
            log('Error parsing RDF content: ' + error);
        } else if (quad) {
            store.addQuad(quad);
        } else {
            log('File loaded successfully. Triples count: ' + store.size);
        }
    });
}

// Existing function to load file content from IndexedDB
async function loadFileFromIndexDB(fileName) {
    const content = await loadFileFromList(fileName);
    if (content) {
        // Load content into textarea and parse RDF
        document.getElementById('rdfInput').value = content;
        loadRDFContent(content);
    } else {
        log('Failed to load file from IndexedDB.');
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

// Event listener for file buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('fileOpenBtn')) {
        const section = e.target.closest('.file-section');
        const select = section.querySelector('.file-select');
        if (select.value) {
            loadFileFromIndexDB(select.value);
        } else {
            alert('Please select a file to open.');
        }
    }
});
