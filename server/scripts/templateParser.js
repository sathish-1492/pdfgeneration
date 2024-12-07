class TemplateParser {

    constructor(pageTemplate) {
        this.pageTemplate = pageTemplate
        this.macros = {};
    }

    getIncludeContent(templatesContent, tempIdContent) {
        const includeRegex = /{%\s*include\s*"(.*?)"\s*%}/g;
        let match;
        let parsedContent = tempIdContent;

        while ((match = includeRegex.exec(tempIdContent)) !== null) {
            const includeTag = match[0];
            const includTemplateId = match[1];

            if (templatesContent[includTemplateId]) {
                const { htmlcontent } = templatesContent[includTemplateId];
                const includedContent = this.getIncludeContent(templatesContent, htmlcontent);
                parsedContent = parsedContent.replace(includeTag, includedContent);
            } else {
                throw new Error(`Include Template "${includTemplateId}" not found.`);
            }
        }

        return parsedContent;
    }

    getMacros(templateContent) {
        // Define a regular expression to capture the macro name and its content
        const macroRegex = /{%\s*macro\s+(\w+)\s*\(([^)]*)\)\s*%}([\s\S]*?){%\s*endmacro\s*%}/g;
        let match;

        while ((match = macroRegex.exec(templateContent)) !== null) {
            const macroName = match[1]; // Extract macro name
            const macroArgs = match[2]; // Extract macro arguments
            const macroContent = match[3].trim(); // Extract macro content

            const includedContent = this.getIncludeContent(this.pageTemplate, macroContent);
            let macrojsContent = this.parse(includedContent);
            macrojsContent = macrojsContent.replace(/[\t\r]+/g, ' ').replace(/\s\s+/g, ' ').trim();

            this.macros[macroName] = {
                name: macroName,
                args: macroArgs,
                content: macrojsContent,
            }
        }
        //console.log('this.macros', this.macros);
    }

    renderMacros(macroStr) {

        let retMacro = '';
        if (macroStr) {
            const spl = macroStr.split(',');

            spl.forEach(macro => {
                const macroObj = this.macros[macro];
                if (macroObj) {
                    // Return the JavaScript function
                    const convertStr = `\n function ${macroObj.name}(models, ${macroObj.args}) {
                        \n let obj = ${macroObj.args}.split('.')[0]; 
                        \n if(obj) {
                        \n  //  models = models[obj]
                        \n}   
                        ${macroObj.content};
                    }\n\n`.trim();

                    retMacro += convertStr;
                }
            })
        }

        return retMacro;
    }

    assignMents(match, name) {
        const fnRegex = /(\w+)\s*=\s*(\w+)\(([^)]*)\)/;
        const variableRegex = /(\w+)\s*=\s*([^)]*)/;

        const fnMatch = name.match(fnRegex);
        const varMatch = name.match(variableRegex);
        if (fnMatch) {
            const [fullMatch, variableName, functionName, args] = fnMatch;
            name = `${variableName} = ${functionName}(models, '${args}')`

            return "`;\nlet " + name + ";\ndata['" + variableName + "'] = " + variableName + "; output += `";
        } else if (varMatch) {
            const [fullMatch, variableName, variable] = varMatch;

            return "`\nlet " + variableName + " = getValue(models, '" + variable + "');`";
        }
    }

    getVariables(match, key) {
        // Handle {{ variable }} tags
        const fnRegex = /(\w+)\s*\(([^)]*)\)/;
        const fnMatch = key.match(fnRegex);

        let keyValue;
        if (fnMatch) {
            keyValue = `${fnMatch[1]}(models, '${fnMatch[2]}')`;

            return "${" + keyValue + "}";
        } else {
            keyValue = `'${key}'`;
            return "${getValue(models, " + keyValue + ")}";
        }
    }

    parseIfCondition(match, cond) {
        return this.parseCondition("if", cond)
    }

    parseELIFCondition(match, cond) {
        return this.parseCondition("} else if", cond)
    }

    parseCondition(type, cond) {


        const multiConditionRegex = /(\s*!\s*|\s*typeof\s+)?([a-zA-Z0-9_-][\w-]*(\.[a-zA-Z0-9_-][\w-]*(?:\s*\|\s*\w+)?)*)(\s*(==|!=|>|<|>=|<=)\s*(true|false|[a-zA-Z0-9_-][\w-]*(\.[a-zA-Z0-9_-][\w-]*)*|'[^']*'|"[^"]*"|\d+))?(\s*(&&|\|\|)?\s*)?/g;
        const matches = Array.from(cond.matchAll(multiConditionRegex));

        let values = "`\n" + type;
        let index = 0;

        for (const match of matches) {
            const prefix = match[1];
            const leftCondition = match[2];
            const operator = match[5];
            const rightCondition = match[6];
            const logicalOperator = match[8];


            if (matches.length > 1 && index == 0) {
                values += " (";
            }



            if (prefix == '!') {
                values += "(!getValue(models, '" + leftCondition + "'))";

            } else if (prefix && operator && rightCondition) {
                values += " (" + prefix + " " + leftCondition + " " + operator + " " + rightCondition + ")";
            } else if (operator && rightCondition) {

                const fieldRegex = /(\w+(?:\.\w+)?)\s*\|\s*(\w+)/;
                const filterMatch = leftCondition.match(fieldRegex);
                if (filterMatch) {
                    values += "(getValue(models, '" + filterMatch[1] + "', filters." + filterMatch[2] + ") " + operator + " " + rightCondition + ")";

                } else if (rightCondition.startsWith('"') && rightCondition.endsWith('"') || rightCondition.startsWith("'") && rightCondition.endsWith("'")) {
                    values += "(getValue(models, '" + leftCondition + "') " + operator + " " + rightCondition + ")";

                } else {
                    values += "(getValue(models, '" + leftCondition + "') " + operator + " getValue(models, '" + rightCondition + "'))";
                }

            } else {
                values += "(getValue(models, '" + leftCondition + "'))";
            }

            index++;

            if (logicalOperator) {
                //&& or || operators 
                values += logicalOperator;
            } else {

                if (matches.length > 1 && index == matches.length) {
                    values += ")";
                }
                values += " {\noutput += `";

            }

        }

        //console.log('valuesss', values);
        return values;
    }

    parseArrayForOfLoop(match, key, property) {
        return "`;\nfor (let " + key + " of getValue(models, '" + property + "')) {\n models['" + key + "']=" + key + ";\noutput += `";  // Handle for loops
    }

    parseJSONForInLoop(match, key, property) {
        return "`;\nfor (let " + key + " in getValue(models, '" + property + "')) {\n models['" + key + "']=getValue(models, '" + property + "')[" + key + "];\noutput += `";  // Handle for loops
    }

    parseJSONKeyValueForInLoop(match, key, value, property) {
        return "`;\nfor (let [" + key + ", " + value + "] of Object.entries(getValue(models, '" + property + "'))) {\n models['" + key + "']=" + key + ";\n models['" + value + "']=" + value + " \noutput += `";  // Handle for loops

    }

    parseEndLoop() {
        return "`;\n}\noutput += `"; // Handle endfor
    }


    parseFilters(match, name, filterName) {
        let ftName;
        if (filterName.startsWith('date:')) {
            const format = filterName.replace('date:', '')
            ftName = `format, ${format}`;
        } else {
            ftName = filterName;
        }

        return "${getValue(models, '" + name + "', filters." + ftName + ")}";
    }

    parse(sourceContent) {

        let functionBody = "\nlet output = '';";

        functionBody += "\noutput += `" + sourceContent
            .replace(/`/g, '\\`') // Escape backticks in the template
            .replace(/{%\s*set\s*(.*?)\s*%}/g, this.assignMents.bind(this)) // Handle set conditions
            .replace(/{{\s*(.*?)\s*\|\s*(.*?)\s*}}/g, this.parseFilters.bind(this)) // Handle variables
            .replace(/{{\s*(.*?)\s*}}/g, this.getVariables.bind(this)) // Handle variables
            .replace(/{%\s*if\s*(.*?)\s*%}/g, this.parseIfCondition.bind(this)) // Handle if conditions
            .replace(/{%\s*elif\s*(.*?)\s*%}/g, this.parseELIFCondition.bind(this)) // Handle elif conditions
            .replace(/{%\s*else\s*%}/g, "`;\n} else {\noutput += `") // Handle else conditions
            .replace(/{%\s*endif\s*%}/g, "`;\n}\noutput += `") // Handle endif
            .replace(/{%\s*for\s*(.*?)\s*of\s*(.*?)\s*%}/g, this.parseArrayForOfLoop.bind(this))
            .replace(/{%\s*for\s*(.*?),\s*(.*?)\s*in\s*(.*?)\s*%}/g, this.parseJSONKeyValueForInLoop.bind(this))
            .replace(/{%\s*for\s*(.*?)\s*in\s*(.*?)\s*%}/g, this.parseJSONForInLoop.bind(this))
            .replace(/{%\s*endfor\s*%}/g, this.parseEndLoop)
            + "`;\nreturn output.trim();";



        //console.info('parsedHTML', functionBody);
        return functionBody

    }

    parser() {

        const parsedContent = {};

        Object.entries(this.pageTemplate).forEach(([templateId, templateObject]) => {
            const { internal, is_macros, macro_name, htmlcontent } = templateObject;

            if (is_macros) {
                this.getMacros(htmlcontent);
            } else if (!internal) {

                const includedContent = this.getIncludeContent(this.pageTemplate, htmlcontent);
                const functionStr = this.renderMacros(macro_name) + this.parse(includedContent);
                parsedContent[templateId] = functionStr;

                // console.log(`templateId: ${templateId}, parserHTMl ::: ${functionStr}`);
            }
        });



        return parsedContent;
    }
}

module.exports = TemplateParser;