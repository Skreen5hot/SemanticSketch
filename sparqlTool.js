//11-1-2024  8:15am
let store = new N3.Store();
const DEBUG = true; // Set to true for debugging

function log(message) {
    if (DEBUG) {
        console.log(message);
    }
    document.getElementById('results').innerHTML += message + '<br>';
}

async function executeQuery() {
    const queryEngine = new Comunica.QueryEngine();
    let query = document.getElementById('queryInput').value.trim();
    
    // Log the original query input
    log('Original Query: ' + query);

    // Replace 'a' with 'rdf:type' correctly without angle brackets
    query = query.replace(/\ba\s/g, 'rdf:type ');
    log('After replacing "a" with "rdf:type": ' + query);

    // Check for and process prefixes
    const prefixRegex = /^PREFIX\s+(\w+:\s*<[^>]+>\s*)+/g;
    const prefixMatch = query.match(prefixRegex);
    if (prefixMatch) {
        // Remove prefixes from the main query to avoid parsing errors
        query = query.replace(prefixRegex, '');
        log('After removing prefixes: ' + query);
    }

    // Replace IRI patterns with angle brackets
    query = query.replace(/(\bhttp:\/\/[^\s<>]+)(?=\s)/g, '<$1>'); // Add brackets around IRIs
    log('After processing IRI patterns: ' + query);

    // Wrap unbracketed CURIEs (e.g., prefix:localPart) in angle brackets
    query = query.replace(/\b(\w+:\w+)\b(?!>)/g, '<$1>');
    log('After wrapping unbracketed CURIEs: ' + query);

    // Log the final query before execution
    log('Final Query to Execute: ' + query);
    log('Store size: ' + store.size);

    try {
        const result = await queryEngine.query(query, { sources: [store] });
        
        log('Query executed. Result type: ' + result.resultType);

        if (result.resultType === 'bindings') {
            const bindingsStream = await result.execute();
            
            let tableHTML = '<table border="1"><thead><tr>';
            let headers = [];
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
            log('Unsupported result type.');
        }
    } catch (error) {
        log('Error executing query: ' + error);
        document.getElementById('results').textContent = 'Error: ' + error.message;
    }
}


