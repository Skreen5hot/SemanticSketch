    let store = new N3.Store();
        const DEBUG = false;

        function log(message) {
            if (DEBUG) {
                console.log(message);
            }
            document.getElementById('results').innerHTML += message + '<br>';
        }

        document.getElementById('fileInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = function(e) {
                const content = e.target.result;
                const fileExtension = file.name.split('.').pop().toLowerCase();
                
                if (fileExtension === 'ttl') {
                    parseWithN3(content, 'Turtle');
                } else if (fileExtension === 'owl' || fileExtension === 'rdf') {
                    parseWithRdfParser(content);
                } else {
                    log('Unsupported file format');
                }
            };

            reader.readAsText(file);
        });

        function parseWithN3(content, format) {
            const parser = new N3.Parser({ format: format });
            parser.parse(content, (error, quad, prefixes) => {
                if (error) {
                    log('Error parsing file: ' + error);
                } else if (quad) {
                    store.add(quad);
                } else {
                    log('File loaded successfully. Triples count: ' + store.size);
                }
            });
        }

        function parseWithRdfParser(content) {
            const rdfParser = new DOMParser();
            const xmlDoc = rdfParser.parseFromString(content, "text/xml");
            const triples = [];

            function extractTriples(subject, predicate, object) {
                let objectValue;
                if (typeof object === 'string') {
                    objectValue = object;
                } else if (object && typeof object === 'object') {
                    objectValue = object.getAttribute && object.getAttribute('rdf:resource') || object.textContent && object.textContent.trim();
                }
                if (objectValue) {
                    triples.push({ subject, predicate, object: objectValue });
                }
            }

            function traverseXML(node, subject) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const nodeName = node.nodeName;
                    const newSubject = node.getAttribute('rdf:about') || node.getAttribute('rdf:ID') || subject;

                    if (nodeName === 'owl:Class') {
                        for (let child of node.childNodes) {
                            if (child.nodeType === Node.ELEMENT_NODE) {
                                if (child.nodeName === 'owl:equivalentClass') {
                                    handleEquivalentClass(child, newSubject);
                                } else {
                                    extractTriples(newSubject, child.nodeName, child);
                                }
                            }
                        }
                    } else if (nodeName !== 'rdf:RDF' && nodeName !== 'rdf:Description') {
                        for (let child of node.childNodes) {
                            if (child.nodeType === Node.ELEMENT_NODE) {
                                const predicate = child.nodeName;
                                if (child.hasAttribute('rdf:resource')) {
                                    extractTriples(newSubject, predicate, child);
                                } else if (child.childNodes.length > 0) {
                                    traverseXML(child, newSubject);
                                } else {
                                    extractTriples(newSubject, predicate, child);
                                }
                            }
                        }
                    } else {
                        for (let child of node.childNodes) {
                            traverseXML(child, newSubject);
                        }
                    }
                }
            }

            function handleEquivalentClass(node, subject) {
                for (let child of node.childNodes) {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        if (child.nodeName === 'owl:Class') {
                            const oneOf = child.getElementsByTagName('owl:oneOf')[0];
                            if (oneOf) {
                                const members = oneOf.getElementsByTagName('rdf:Description');
                                for (let member of members) {
                                    const memberURI = member.getAttribute('rdf:about');
                                    if (memberURI) {
                                        extractTriples(memberURI, 'rdf:type', subject);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const rdfRoot = xmlDoc.documentElement;
            if (rdfRoot) {
                traverseXML(rdfRoot, '');
            }

            triples.forEach(triple => {
                store.addQuad(
                    N3.DataFactory.namedNode(triple.subject),
                    N3.DataFactory.namedNode(triple.predicate),
                    triple.object.startsWith('http') ? N3.DataFactory.namedNode(triple.object) : N3.DataFactory.literal(triple.object)
                );
            });

            log('File loaded successfully. Triples count: ' + store.size);
        }

        async function executeQuery() {
            const queryEngine = new Comunica.QueryEngine();
            let query = document.getElementById('queryInput').value.trim();

            // Replace 'a' with 'rdf:type'
            query = query.replace(/\ba\s/g, 'rdf:type ');

            // Check for and process prefixes
            const prefixRegex = /^PREFIX\s+(\w+:\s*<[^>]+>\s*)+/g;
            const prefixMatch = query.match(prefixRegex);
            if (prefixMatch) {
                // Remove prefixes from the main query to avoid parsing errors
                query = query.replace(prefixRegex, '');
            }
            // Replace IRI patterns with angle brackets if necessary
            query = query.replace(/(\bhttp:\/\/[^\s<>]+)(?=\s)/g, '<$1>'); // Add brackets around IRIs
            // Wrap unbracketed CURIEs (e.g., prefix:localPart) in angle brackets
            query = query.replace(/\b(\w+:\w+)\b(?!>)/g, '<$1>');

            log('Starting query execution...');
            log('Query: ' + query);
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

        function testOptionalQuery() {
            const query = `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                SELECT ?s ?p ?o ?optional
                WHERE { 
                    ?s ?p ?o .
                    OPTIONAL { ?s <http://example.org/optionalPredicate> ?optional }
                }
            `;
            document.getElementById('queryInput').value = query;
            executeQuery();
        }

        function testPropertyPathQuery() {
            const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?s ?o
WHERE {
?s (rdf:type|rdfs:subClassOf)* ?o .
}
            `;
            document.getElementById('queryInput').value = query;
            executeQuery();
        }

        function testAggregationQuery() {
            const query = `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX ex: <http://example.org/>
                SELECT (COUNT(?o) AS ?count) ?p
                WHERE {
                    ?s ?p ?o
                }
                GROUP BY ?p
            `;
            document.getElementById('queryInput').value = query;
            executeQuery();
        }
