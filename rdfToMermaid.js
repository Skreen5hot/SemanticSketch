        let classLabels = {};
        let restrictionNodes = {};

        function rdfToMermaid(rdfInput) {
            const store = $rdf.graph();
            const contentType = 'text/turtle';
            const baseIRI = 'http://example.org/';

            try {
                $rdf.parse(rdfInput, store, baseIRI, contentType);

                let mermaidOutput = "graph TD\n";
                classLabels = {};
                restrictionNodes = {};

                store.statements.forEach(triple => {
                    const subject = triple.subject.value;
                    const predicate = triple.predicate.value;
                    const object = triple.object.value;

                    if (predicate.endsWith('label')) {
                        classLabels[subject] = object;
                    }
                });

                store.statements.forEach(triple => {
                    const subject = triple.subject.value;
                    const predicate = triple.predicate.value;
                    const object = triple.object.value;

                    if (subject.startsWith('_:') || object.startsWith('_:')) {
                        return; // Ignore blank nodes
                    }

                    if (subject === object) {
                        return; // Skip self-directed edges
                    }

                    if (predicate.endsWith('subClassOf')) {
                        mermaidOutput += `${formatNode(subject)} -- subClassOf --> ${formatNode(object)}\n`;
                    }

                    if (predicate.endsWith('domain')) {
                        const property = subject;
                        const domain = object;
                        const rangeTriple = store.statements.find(t => t.subject.value === property && t.predicate.value.endsWith('range'));
                        if (rangeTriple) {
                            const range = rangeTriple.object.value;
                            const labelTriple = store.statements.find(t => t.subject.value === property && t.predicate.value.endsWith('label'));
                            const propertyLabel = labelTriple ? labelTriple.object.value : formatNode(property);

                            if (domain !== range) {
                                mermaidOutput += `${formatNode(domain)} -- ${propertyLabel} --> ${formatNode(range)}\n`;
                            }
                        }
                    }

                    // Handle OWL Restrictions
                    if (predicate.endsWith('onProperty') || predicate.endsWith('allValuesFrom')) {
                        const restrictionLabel = `Restriction: ${predicate.split('#').pop()}`;
                        if (!restrictionNodes[subject]) {
                            restrictionNodes[subject] = `${restrictionLabel}`;
                        }
                        mermaidOutput += `${formatNode(subject)} -- ${restrictionLabel} --> ${formatNode(object)}\n`;
                    }

                    // Handle Disjoint Classes
                    if (predicate.endsWith('disjointWith')) {
                        mermaidOutput += `${formatNode(subject)} -- disjointWith --> ${formatNode(object)}\n`;
                    }
                });

                return mermaidOutput;
            } catch (error) {
                console.error("Error parsing RDF:", error);
                return "Error parsing RDF: " + error.message;
            }
        }

        function formatNode(iri) {
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
            const rdfInput = document.getElementById("rdfInput").value;
            let mermaidOutput = rdfToMermaid(rdfInput);

            // Use Mermaid syntax from the RDF conversion
            document.getElementById('mermaid-syntax').textContent = mermaidOutput;
            
            // Set the innerHTML of the output div with the Mermaid syntax
            const mermaidDiv = document.getElementById('mermaid-output');
            mermaidDiv.innerHTML = mermaidOutput;

            // Trigger Mermaid to re-render the diagrams in the updated div
            mermaid.init(undefined, mermaidDiv);
        }

        // Initialize Mermaid
        document.addEventListener("DOMContentLoaded", function() {
            mermaid.initialize({ startOnLoad: false });
        });
