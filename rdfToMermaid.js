
    let classLabels = {};
    let restrictionNodes = {};
    let diagramCounter = 0;

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
        console.log("Parsing N-Triples manually...");
        const triples = [];
        const lines = rdfInput.trim().split('\n');

        lines.forEach(line => {
            console.log("Processing line:", line);

            // Extract subject, predicate, and object using regex
            const match = line.match(/<([^>]+)> <([^>]+)> (.+) \./);
            if (match) {
                const subject = match[1];
                const predicate = match[2];
                let object = match[3];

                // Handle literals and URIs differently
                if (object.startsWith('"')) {
                    // Literal object
                    object = object.split('^^')[0].replace(/^"|"$/g, ''); // Remove datatype and quotes
                    const formattedObject = object.replace(/\s+/g, '_'); // Replace spaces with underscores
                    triples.push({ subject, predicate, object: `${formattedObject}["${object}"]` });
                } else {
                    // URI object
                    object = object.replace(/^<|>$/g, ''); // Remove angle brackets
                    // Replace spaces with underscores in URIs
                    triples.push({ subject, predicate, object: formatNode(object) });
                }
            } else {
                console.error("Invalid N-Triples line format:", line);
            }
        });

        console.log("Parsed triples:", triples);
        return triples;
    }

    function rdfToMermaid(rdfInput, format) {
        console.log("Converting RDF to Mermaid...");
        console.log("Format:", format);

        let triples = format === 'ntriples' ? parseNTriples(rdfInput) : parseTurtle(rdfInput);

        let mermaidOutput = "graph TD\n";
        triples.forEach(triple => {
            const subject = triple.subject;
            const predicate = triple.predicate;
            const object = triple.object;

            console.log("Processing triple:", triple);

            const truncatedPredicate = truncateURI(predicate); // Truncate the predicate

            if (format === 'ntriples') {
                mermaidOutput += processNTriples(subject, truncatedPredicate, object);
            } else {
                mermaidOutput += processTurtle(subject, truncatedPredicate, object, triples);
            }
        });

        console.log("Generated Mermaid output:", mermaidOutput);
        return mermaidOutput;
    }

    // Helper function to parse Turtle data
    function parseTurtle(rdfInput) {
        const store = $rdf.graph();
        const contentType = 'text/turtle';
        const baseIRI = 'http://example.org/';

        try {
            $rdf.parse(rdfInput, store, baseIRI, contentType);

            return store.statements.map(triple => ({
                subject: triple.subject.value,
                predicate: triple.predicate.value,
                object: triple.object.value,
                isLiteral: triple.object.termType === "Literal" // Detect literal
            }));
        } catch (error) {
            console.error("Error parsing RDF:", error);
            return [];
        }
    }

    // Helper function to extract the last part of a URI (after # or /)
    function truncateURI(uri) {
        const splitURI = uri.split(/[#\/]/);
        return splitURI[splitURI.length - 1];
    }

    // Helper function to process N-Triples triples
    function processNTriples(subject, predicate, object) {
        return `${formatNode(subject)} -- ${predicate} --> ${object}\n`;
    }

    // Helper function to process Turtle triples
    function processTurtle(subject, predicate, object, triples) {
        if (typeof predicate === 'undefined' || typeof object === 'undefined') {
            console.error("Undefined predicate or object in triple:", subject, predicate, object);
            return ''; // Skip if predicate or object is undefined
        }

        if (predicate.endsWith('subClassOf')) {
            return `${formatNode(subject)} -- subClassOf --> ${formatNode(object)}\n`;
        } else if (predicate.endsWith('domain')) {
            const property = subject;
            const domain = object;
            const rangeTriple = triples.find(t => t.subject === property && t.predicate.endsWith('range'));
            if (rangeTriple) {
                const range = rangeTriple.object;
                const labelTriple = triples.find(t => t.subject === property && t.predicate.endsWith('label'));
                const propertyLabel = labelTriple ? labelTriple.object : formatNode(property);

                if (domain !== range) {
                    return `${formatNode(domain)} -- ${propertyLabel} --> ${formatNode(range)}\n`;
                }
            }
        } else if (predicate.endsWith('onProperty') || predicate.endsWith('allValuesFrom')) {
            const restrictionLabel = `Restriction: ${predicate.split('#').pop()}`;
            return `${formatNode(subject)} -- ${restrictionLabel} --> ${formatNode(object)}\n`;
        } else if (predicate.endsWith('disjointWith')) {
            return `${formatNode(subject)} -- disjointWith --> ${formatNode(object)}\n`;
        }

        return ''; // Default case
    }

    // Helper function to format the node
    function formatNode(iri) {
        const node = truncateURI(iri);
        return node.replace(/\s+/g, '_'); // Replace spaces with underscores
    }

    function initializeMermaid() {
        console.log("Initializing Mermaid...");
        mermaid.initialize({ startOnLoad: false });
    }

    function generateMermaidDiagram() {
        console.log("Generating Mermaid diagram...");
        const rdfInput = document.getElementById("rdfInput").value;
        const format = detectRDFFormat(rdfInput);
        console.log("Detected format:", format);

        // Generate Mermaid output
        let mermaidOutput = rdfToMermaid(rdfInput, format);

        // Clear the previous Mermaid syntax
        document.getElementById('mermaid-output').innerHTML = '';

        // Set the Mermaid syntax
        document.getElementById('mermaid-syntax').value = mermaidOutput;

        // Re-run Mermaid to render the diagram
        reRunMermaidDiagram();
    }

    function reRunMermaidDiagram() {
        console.log("Re-running Mermaid diagram...");
        const mermaidDiv = document.getElementById('mermaid-output');
        const mermaidContent = document.getElementById('mermaid-syntax').value;

        // Clear the current diagram
        mermaidDiv.innerHTML = '';

        // Create a new div for the updated Mermaid diagram
        const newDiv = document.createElement('div');
        newDiv.className = 'mermaid';
        newDiv.innerHTML = mermaidContent;
        mermaidDiv.appendChild(newDiv);

        // Trigger Mermaid to render the new diagram
        try {
            mermaid.init(undefined, newDiv);
        } catch (error) {
            console.error("Error re-rendering Mermaid:", error);
        }
    }

   function downloadDiagram() {
        const mermaidDiv = document.getElementById('mermaid-output');

        // Ensure Mermaid has finished rendering
        setTimeout(() => {
            html2canvas(mermaidDiv).then(canvas => {
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = 'mermaid-diagram.png';
                link.click();
            }).catch(error => {
                console.error("Error generating PNG:", error);
            });
        }, 1000); // Adjust the timeout value if needed

    }

    initializeMermaid();

document.addEventListener('DOMContentLoaded', () => {
  refreshFileUI();  // Ensure this is called after the page is fully loaded
});
