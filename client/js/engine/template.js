(function (global) {

     // DateFilter.js
     class DateFilter {
        constructor(locale = 'en-US') {
            this.locale = locale;
            // Define month names for different tokens
            this.monthNames = {
                short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                full: ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
            };
            // Define day names if needed in future
            // this.dayNames = { ... };
        }

        /**
         * Formats a date based on the given format string.
         * @param {Date|string} date - The date to format.
         * @param {string} formatStr - The format string (e.g., 'Y-m-d H:i').
         * @returns {string} - The formatted date string.
         */
        format(date, formatStr) {
            let dt;
            if (date instanceof Date) {
                dt = date;
            } else {
                dt = new Date(date);
                if (isNaN(dt)) {
                    throw new Error('Invalid date');
                }
            }

            const tokens = {
                // Year
                'Y': () => dt.getFullYear(),
                'y': () => (dt.getFullYear() % 100).toString().padStart(2, '0'),
                // Month
                'm': () => (dt.getMonth() + 1).toString().padStart(2, '0'),
                'n': () => (dt.getMonth() + 1).toString(),
                'M': () => this.monthNames.short[dt.getMonth()],
                'F': () => this.monthNames.full[dt.getMonth()],
                // Day
                'd': () => dt.getDate().toString().padStart(2, '0'),
                'j': () => dt.getDate().toString(),
                // Hour
                'H': () => dt.getHours().toString().padStart(2, '0'),
                'G': () => dt.getHours().toString(),
                'h': () => {
                    let h = dt.getHours() % 12;
                    h = h === 0 ? 12 : h;
                    return h.toString().padStart(2, '0');
                },
                'g': () => {
                    let h = dt.getHours() % 12;
                    h = h === 0 ? 12 : h;
                    return h.toString();
                },
                // Minute
                'i': () => dt.getMinutes().toString().padStart(2, '0'),
                // Second
                's': () => dt.getSeconds().toString().padStart(2, '0'),
                // AM/PM
                'A': () => dt.getHours() >= 12 ? 'PM' : 'AM',
                'a': () => dt.getHours() >= 12 ? 'pm' : 'am',
                // Add more tokens as needed
            };

            // Regex to match all tokens
            const tokenRegex = /Y|y|m|n|M|F|d|j|H|G|h|g|i|s|A|a/g;

            const formatted = formatStr.replace(tokenRegex, (match) => {
                if (tokens[match]) {
                    return tokens[match]();
                }
                return match;
            });

            return formatted;
        }
    }

    const df = new DateFilter();
    class Filters {

        static json(node) {
            return JSON.stringify(node);
        }

        static upper(node) {
            return node.toUpperCase()
        }

        static lower(node) {
            return node.toLowerCase();
        }

        static length(node) {
            return node.length;
        }

        static format(data, format) {
            return df.format(data, format)
        }
    }


    //expressions tags if, for, elif, else, endif, endfor, include, macros,
    //Filters json, String => upper, lower, length
    class TemplateRenderer {
        constructor(next) {
            this.callback = next;
            this.templates = {};
            this.getCacheTemplates();
        }

        getCacheTemplates() {
            if (templateCache) {
                Object.entries(templateCache).forEach(([tempId, tempString]) => {
                    this.templates[tempId] = new Function('models', 'getValue', 'filters', tempString)
                });
            }
            this.callback(this);

        }

        execute(option) {
            if (!option.template_id) {
                throw new Error(`Template id ${option.template_id} is not found`);
            }
            if (!option.target_id) {
                throw new Error(`Target id ${option.target_id} is not found`);
            }

            const insertType = option.insert_type || 'innerHTML';

            // Utility function to safely access data properties
            function getValue(data, key, filter, args) {

                let match, number, operator, numberPosition;

                function resolvedExpression(value) {
                    if (numberPosition == 'before') {
                        const beforeFunc = new Function(`return ${number} ${operator} ${value}`);
                        return beforeFunc();
                    } else if (numberPosition == 'after') {
                        const afterFunc = new Function(`return ${value} ${operator} ${number}`);
                        return afterFunc();
                    } else {
                        return value;
                    }
                }

                // Regular expression to capture both patterns
                const arithmeticRegex = /(-?\d+(\.\d+)?)(\s*[+\-*/]\s*)([\w.]+)|([\w.]+)(\s*[+\-*/]\s*)(-?\d+(\.\d+)?)/g;
                while ((match = arithmeticRegex.exec(key)) !== null) {
                    if (match[1]) {

                        number = match[1];      // Either the first group or the seventh group
                        operator = match[3];
                        key = match[4];        // Either the fourth group or the fifth group
                        numberPosition = "before";

                    } else if (match[5]) {
                        key = match[5];        // Either the fourth group or the fifth group
                        operator = match[6];
                        number = match[7];      // Either the first group or the seventh group
                        numberPosition = "after";
                    }
                }

                const value = key.split('.').reduce((acc, part) => acc && acc[part], data);

                if (filter && value) {
                    return (args) ? filter(value, args) : filter(value)
                }

                let retValue = value !== undefined ? value : '';
                if (number && operator) {
                    retValue = resolvedExpression(value);
                }
                return retValue;
            }

            var templateFunction = this.templates[option.template_id];
            if (templateFunction) {
                // Render the template with data
                const renderedHtml = templateFunction(option.models, getValue, Filters);
                //   console.log("data  ", model)
                //  console.log("output", renderedHtml)
                if (!renderedHtml) {
                    throw new Error('HTML is not found', option.template_id);
                }

                var targetElement;
                if (option.target_id instanceof HTMLElement) {
                    targetElement = option.target_id;
                } else if ($Is.isString(option.target_id)) {
                    targetElement = $dom.getElement('#' + option.target_id);
                }

                if (targetElement) {
                    if (insertType == 'innerHTML') {
                        targetElement.innerHTML = renderedHtml;
                    } else if (insertType == 'append') {
                        targetElement.insertAdjacentHTML('beforeend', renderedHtml,);
                    } else if (insertType == 'replace') {
                        targetElement.outerHTML = renderedHtml;
                    }

                    if (option.class_name) {
                        this.bindTemplateEvents(targetElement, option.class_name);
                    }
                    if (option.callback) {
                        option.html = targetElement;
                        option.callback(option)
                    }
                } else {
                    console.error(`" Target Element ${option.target_id}" is not found.`);
                }

            } else {
                console.error(`"${option.template_id}" template is not found.`);
            }

        }

        bindTemplateEvents(content, obj) {
            var events = $dom.getElements('[data-event]', content);
            events.forEach(evnt => {
                var value = $dom.attr('data-event', evnt);
                var eventType = value.split(' ')[0];
                var funcName = value.split(' ')[1].split('.');
                if (obj) {
                    if (obj[funcName[1]]) {
                        $event.bindEvent(evnt, eventType, obj[funcName[1]]);
                    }
                }
            })
        }
    }

    global.template = new TemplateRenderer((template) => {
        $event.customEvent(document, 'template:loaded', template);
    });
})(window);