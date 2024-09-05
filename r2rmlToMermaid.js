function convertR2RMLToMermaid() {
    const r2rmlInput = document.getElementById('r2rmlInput').value;

    if (typeof r2rmlInput !== 'string' || r2rmlInput.trim() === '') {
        throw new TypeError('Expected r2rmlInput to be a non-empty string');
    }

    const triplesMaps = r2rmlInput.split('.\n').filter(Boolean);
    let mermaidOutputArray = [];
    let subjectMapStore = {};

    // Phase 1: Parse and store subject maps for later reference
    triplesMaps.forEach(triplesMap => {
        const triplesMapNameMatch = triplesMap.match(/<#(.+?)>/);
        if (!triplesMapNameMatch) return;

        const triplesMapName = triplesMapNameMatch[1];
        const constantMatch = triplesMap.match(/rr:constant\s+"(.+?)"/);
        const templateMatch = triplesMap.match(/rr:template\s+"(.+?)"/);
        const classNameMatch = triplesMap.match(/rr:class\s+"(.+?)"/);

        let subjectURI = null;
        let className = '';

        if (constantMatch) {
            subjectURI = constantMatch[1];
        }

        if (templateMatch) {
            subjectURI = templateMatch[1];
        }

        if (classNameMatch) {
            className = classNameMatch[1].split('/').pop();
        }

        if (className) {
            mermaidOutputArray.push(`${triplesMapName}["${className}"]`);
        }

        // Store the subject map's name and constant or template for later lookup
        if (subjectURI) {
            subjectMapStore[subjectURI] = triplesMapName;
        }
    });

    // Phase 2: Process predicateObjectMap and create relations
    triplesMaps.forEach(triplesMap => {
        const triplesMapNameMatch = triplesMap.match(/<#(.+?)>/);
        if (!triplesMapNameMatch) return;

        const triplesMapName = triplesMapNameMatch[1];

        // Handle PredicateObjectMaps
        handlePredicateObjectMaps(triplesMap, triplesMapName, mermaidOutputArray, subjectMapStore);
    });

    const mermaidOutput = mermaidOutputArray.join('\n');
    document.getElementById('mermaidOutput').value = mermaidOutput;
}

function handlePredicateObjectMaps(triplesMap, subjectMapName, mermaidOutputArray, subjectMapStore) {
    const predicateObjectMapMatches = triplesMap.match(/rr:predicateObjectMap\s+\[([\s\S]+?)\]/g);

    if (!predicateObjectMapMatches) return;

    predicateObjectMapMatches.forEach(predicateObjectMap => {
        const predicateMatch = predicateObjectMap.match(/rr:predicate\s+"(.+?)"/);
        const parentTriplesMapMatch = predicateObjectMap.match(/rr:parentTriplesMap\s+<#(.+?)>/);
        const constantMatch = predicateObjectMap.match(/rr:constant\s+"(.+?)"/);

        let targetTriplesMap = null;

        // Handle when there is a parentTriplesMap reference
        if (parentTriplesMapMatch) {
            targetTriplesMap = parentTriplesMapMatch[1];
        }

        // Handle when the object map uses a constant
        if (constantMatch) {
            const constantURI = constantMatch[1];
            targetTriplesMap = subjectMapStore[constantURI]; // Lookup the corresponding TriplesMap from Phase 1
        }

        if (predicateMatch && targetTriplesMap) {
            const predicate = predicateMatch[1].split('/').pop();

            // Prevent self-loop by ensuring the target is different from the source
            if (subjectMapName !== targetTriplesMap) {
                mermaidOutputArray.push(`${subjectMapName} -- ${predicate} --> ${targetTriplesMap}`);
            }
        }
    });
}
