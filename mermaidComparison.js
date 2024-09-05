    function extractVariables(line) {
        console.log("Extracting variables from line:");
        console.log(line);
        
        // Regex to handle variable names with dashes and other special characters
        const variablePattern = /(\w[\w-]*)\["([^"]+)"\]/g;
        const variables = {};
        let match;
        while (match = variablePattern.exec(line)) {
            variables[match[1]] = match[2];
            console.log("Variable detected:");
            console.log({ id: match[1], value: match[2] });
        }
        return variables;
    }

    function processEdges(line, variableMap) {
        console.log("Processing edges in line:");
        console.log(line);
        
        // Regex to handle variable names with dashes and other special characters
        const edgePattern = /(\w[\w-]*)(?:\["[^"]+"\])?\s*--\s*([\w_]+)\s*-->\s*(\w[\w-]*)(?:\["[^"]+"\])?/;
        console.log("Edge regex pattern used:");
        console.log(edgePattern);

        const match = edgePattern.exec(line);
        console.log("Edge pattern match details:");
        console.log(match);

        if (match) {
            const [_, sourceVar, predicate, targetVar] = match;
            console.log("Captured groups:");
            console.log({ sourceVar, predicate, targetVar });

            const edge = {
                subject: sourceVar,
                predicate: predicate,
                object: targetVar
            };
            console.log("Edge detected:");
            console.log(edge);
            return edge;
        } else {
            console.log("No edge match found.");
        }
        return null;
    }

    function replaceVariables(edge, variableMap) {
        console.log("Replacing variables in edge:");
        console.log(edge);

        const getValue = (variable) => {
            // Handle special characters like dashes in variable names
            const match = variable.match(/^(\w[\w-]*)(?:\["[^"]+"\])?$/);
            if (match) {
                const value = variableMap[match[1]];
                console.log(`Replacing ${variable} with ${value}`);
                return value || variable;
            }
            return variableMap[variable] || variable;
        };

        const replacedEdge = {
            subject: getValue(edge.subject),
            predicate: edge.predicate,
            object: getValue(edge.object)
        };

        console.log("Replaced edge:");
        console.log(replacedEdge);
        return replacedEdge;
    }

    function parseLine(line, variableMap) {
        console.log("Parsing line:");
        console.log(line);

        const variables = extractVariables(line);
        console.log("Current variable map:");
        console.log(variableMap);
        Object.assign(variableMap, variables);
        console.log("Updated variable map:");
        console.log(variableMap);

        const edge = processEdges(line, variableMap);
        if (edge) {
            return replaceVariables(edge, variableMap);
        }
        return null;
    }

    function runParser() {
        const inputText = document.getElementById('mermaidInput').value;
        console.log("Running parser with input:");
        console.log(inputText);

        const lines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log("Lines extracted:");
        console.log(lines);
        
        const variableMap = {};
        const results = [];

        lines.forEach(line => {
            console.log("Processing line:");
            console.log(line);
            const result = parseLine(line, variableMap);
            if (result) {
                results.push(result);
            }
        });

        console.log("Parsed results:");
        console.log(results);
        
        document.getElementById('testOutput').textContent = JSON.stringify(results, null, 2);
    }
