   let classLabels = {};
        let restrictionNodes = {};

        function detectRDFFormat(rdfInput) {
            console.log("Detecting RDF format...");
            console.log("RDF Input:", rdfInput);

            const hasPrefix = rdfInput.includes('@prefix');
            const hasSemicolon = rdfInput.includes(';');
            const hasType = rdfInput.includes(' a ');
            const hasLiteralType = rdfInput.includes('^^');

            console.log("Has @prefix:", hasPrefix);
            console.log("Has semicolon:", hasSemicolon);
            console.log("Has type:", hasType);
            console.log("Has literal type:", hasLiteralType);

            if (hasPrefix || hasSemicolon || hasType) {
                return 'turtle';
            }

            const lines = rdfInput.trim().split('\n');
            const isNTriples = lines.every(line => 
                line.startsWith('<') && 
                line.includes('>') && 
                line.endsWith('.')
            );

            console.log("Is N-Triples:", isNTriples);
            return isNTriples ? 'ntriples' : 'unknown';
        }

        function parseNTriples(rdfInput) {
            console.log("Parsing N-Triples...");
            console.log("N-Triples Input:", rdfInput);

            const triples = [];
            const lines = rdfInput.trim().split('\n');
            lines.forEach(line => {
                console.log("Processing line:", line);

                const parts = line.split(' ');
                if (parts.length < 3) {
                    console.error("Invalid N-Triples line format:", line);
                    return;
                }

                const subject = parts[0].replace(/<|>/g, '');
                const predicate = parts[1].replace(/<|>/g, '');
                let object = parts[2].replace(/<|>/g, '');

                if (object.startsWith('"')) {
                    // Handle literal objects
                    object = object.split('^^')[0].replace(/^"|"$/g, '');
                    triples.push({ subject, predicate, object: `${object}["${object}"]` });
                } else {
                    // Handle non-literal objects
                    object = object.replace(/^<|>$/g, '').replace(/>$/, '');
                    triples.push({ subject, predicate, object });
                }
            });
            console.log("Parsed triples:", triples);
            return triples;
        }

   function rdfToMermaid(rdfInput, format) {
    console.log("Converting RDF to Mermaid...");
    console.log("Format:", format);

    let triples;
    if (format === 'ntriples') {
        triples = parseNTriples(rdfInput);
    } else {
        const store = $rdf.graph();
        const contentType = 'text/turtle';
        const baseIRI = 'http://example.org/';

        try {
            $rdf.parse(rdfInput, store, baseIRI, contentType);

            triples = store.statements.map(triple => ({
                subject: triple.subject.value,
                predicate: triple.predicate.value,
                object: triple.object.value
            }));
        } catch (error) {
            console.error("Error parsing RDF:", error);
            return "Error parsing RDF: " + error.message;
        }
    }

    let mermaidOutput = "graph TD\n";
    classLabels = {};
    restrictionNodes = {};

    triples.forEach(triple => {
        const subject = triple.subject;
        const predicate = triple.predicate;
        const object = triple.object;

        console.log("Processing triple:", triple);

        if (format === 'ntriples') {
            // Always include N-Triples
            if (subject.startsWith('_:') || object.startsWith('_:')) {
                return; // Ignore blank nodes
            }

            if (subject === object) {
                return; // Skip self-directed edges
            }

            // Process N-Triples
            mermaidOutput += `${formatNode(subject)} -- ${predicate} --> ${formatNode(object)}\n`;
        } else {
            // Apply specific conditions for Turtle
            if (subject.startsWith('_:') || object.startsWith('_:')) {
                return; // Ignore blank nodes
            }

            if (subject === object) {
                return; // Skip self-directed edges
            }

            if (predicate.endsWith('subClassOf')) {
                mermaidOutput += `${formatNode(subject)} -- subClassOf --> ${formatNode(object)}\n`;
            } else if (predicate.endsWith('domain')) {
                const property = subject;
                const domain = object;
                const rangeTriple = triples.find(t => t.subject === property && t.predicate.endsWith('range'));
                if (rangeTriple) {
                    const range = rangeTriple.object;
                    const labelTriple = triples.find(t => t.subject === property && t.predicate.endsWith('label'));
                    const propertyLabel = labelTriple ? labelTriple.object : formatNode(property);

                    if (domain !== range) {
                        mermaidOutput += `${formatNode(domain)} -- ${propertyLabel} --> ${formatNode(range)}\n`;
                    }
                }
            } else if (predicate.endsWith('onProperty') || predicate.endsWith('allValuesFrom')) {
                const restrictionLabel = `Restriction: ${predicate.split('#').pop()}`;
                if (!restrictionNodes[subject]) {
                    restrictionNodes[subject] = `${restrictionLabel}`;
                }
                mermaidOutput += `${formatNode(subject)} -- ${restrictionLabel} --> ${formatNode(object)}\n`;
            } else if (predicate.endsWith('disjointWith')) {
                mermaidOutput += `${formatNode(subject)} -- disjointWith --> ${formatNode(object)}\n`;
            }
        }
    });

    console.log("Generated Mermaid output:", mermaidOutput);
    return mermaidOutput;
}


        function formatNode(iri) {
            console.log("Formatting node:", iri);

            if (iri.startsWith('_:')) {
                return ''; // Ignore blank nodes entirely
            }
            const label = classLabels[iri];
            let node = iri.split('/').pop();
            node = node.replace(/^_+/, 'blank_'); // Replace leading "_" with "blank_"
            if (label) {
                return `${node}["${label}"]`;
            }
            return node; // Fallback: just use the last segment of the IRI
        }

        function generateMermaidDiagram() {
            console.log("Generating Mermaid diagram...");
            const rdfInput = document.getElementById("rdfInput").value;
            const format = detectRDFFormat(rdfInput);
            console.log("Detected format:", format);

            let mermaidOutput = rdfToMermaid(rdfInput, format);

            // Use Mermaid syntax from the RDF conversion
            document.getElementById('mermaid-syntax').textContent = mermaidOutput;
            
            // Set the innerHTML of the output div with the Mermaid syntax
            const mermaidDiv = document.getElementById('mermaid-output');
            mermaidDiv.innerHTML = mermaidOutput;

            // Trigger Mermaid to re-render the diagrams in the updated div
            try {
                mermaid.init(undefined, mermaidDiv);
            } catch (error) {
                console.error("Error initializing Mermaid:", error);
            }
        }

        // Initialize Mermaid
        document.addEventListener("DOMContentLoaded", function() {
            mermaid.initialize({ startOnLoad: false });
        });
