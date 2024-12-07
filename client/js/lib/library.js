(function () {
    // lib js

    // console.log("************** LIBRARY START ****************")
    //library file for  reused con
    var win = window;
    var doc = document;

    var dom = {
        getId: function (id, ctx) {
            ctx = ctx || doc;
            return ctx.getElementById(id);
        },

        getElement: function (selectors, ctx) {
            ctx = ctx || doc;
            return ctx.querySelector(selectors);
        },

        getElements: function (selectors, ctx) {
            ctx = ctx || doc;
            return ctx.querySelectorAll(selectors);
        },

        removeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        },

        append(parent, child) {
            parent.appendChild(child);
        },

        attr(name, ctx) {
            ctx = ctx || doc;
            return ctx.getAttribute(name);
        },

        addClass(elem, cls) {
            if (elem && !this.hasClass(elem, cls)) {
                elem.classList.add(cls);
            }
        },

        hasClass(elem, cls) {
            return elem.classList.contains(cls)
        },

        removeClass(elem, cls) {
            if (elem) {
                elem.classList.remove(cls);
            }
        }
    }

    var http = {
        get: function (options) {
            options.method = "GET";
            this.request(options);
        },
        post: function (options) {
            options.method = "POST";
            this.request(options);
        },
        put: function (options) {
            options.method = "PUT";
            this.request(options);
        },
        patch: function (options) {
            options.method = "PATCH";
            this.request(options);
        },
        delete: function (options) {
            options.method = "delete";
            this.request(options);
        },
        request: function (options) {
            var url = options.url;
            var params = options.params || {};
            var headers = options.headers = options.headers || {};

            function toQueryString(obj) {
                return Object.keys(obj)
                    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
                    .join('&');
            }

            if (options.params) {
                var queryString = new URLSearchParams(options.params).toString();
                url += `?${queryString}`;
            }


            const xhr = new XMLHttpRequest();
            xhr.open(options.method, url, options.sync || false);

            for (var headerKey in headers) {
                xhr.setRequestHeader(headerKey, headers[headerKey]);
            }

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) { // 4 means the request is done
                    if (xhr.status === 200 || xhr.status === 201 || xhr.status === 204) { // 200 means a successful response
                        let res;
                        if (options.response_type == 'blob') {
                            res = this.response;
                        } else {
                            res = this.responseText;
                        }
                        options.handler(res)
                    } else {
                        options.error(xhr.responseText);
                    }

                    if(options.mask) {
                        const mask = $dom.getId('mask');
                        if(mask) {
                            mask.style.display = 'none';
                        }
                    }
                   
                }
            };

            if (options.response_type) {
                xhr.responseType = options.response_type
            }

            var data;
            if (typeof params == 'object') {
                var v = [];
                for (var p in params) {
                    v.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
                }
                if (v.length > 0) {
                    data = v.join('&');
                }
            } else if (typeof params === 'string') { //No I18N
                data = params;
            }
            if (options.method === "GET" && data) {
                url += ((url.indexOf('?') + 1) ? '&' : '?') + data;
            }

            const jsonData = JSON.stringify(options.bodyJSON || {});
            if(options.mask) {
                const mask = $dom.getId('mask');
                if(mask) {
                    mask.style.display = '';
                }
            }

            xhr.send(jsonData);
        },

        uploadImage: function (options) {
            const url = options.url;
            const headers = options.headers = options.headers || {};
            const method = 'POST';

            const xhr = new XMLHttpRequest();
            xhr.open(method, url, options.sync || false);

            for (var headerKey in headers) {
                xhr.setRequestHeader(headerKey, headers[headerKey]);
            }

            xhr.upload.onprogress = function (event) {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    if (options.process) {
                        options.progress(percentComplete);
                    }
                    console.info(`Uploading: ${Math.round(percentComplete)}%`);
                }
            };

            xhr.onprogress = function (event) {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    if (options.process) {
                        options.progress(percentComplete);
                    }
                    console.info(`onprogress Uploading: ${Math.round(percentComplete)}%`);
                }
            };

            // xhr.onreadystatechange = function () {
            //     if (xhr.readyState === 4) { // 4 means the request is done
            //         if (xhr.status === 200 || xhr.status === 201) { // 200 means a successful response
            //             options.handler(this.responseText)
            //         } else {
            //             options.error(xhr.responseText);
            //         }
            //     }
            // };

            xhr.onload = function () {
                if (xhr.status === 200 || xhr.status === 201) {
                    console.log('File uploaded successfully:', xhr.responseText);
                    options.handler(this.responseText)
                } else {
                    console.error('Upload failed');
                }
            };

            xhr.send(options.image);
        }
    }

    class EventManager {
        constructor() {
            this.eventListeners = [];
        }

        // Method to bind an event listener and store a reference to it
        bindEvent(element, eventType, callback, option) {
            element.addEventListener(eventType, callback, false, option);

            // Store the event listener details for later removal
            this.eventListeners.push({ element, eventType, callback });
        }

        // Method to remove a specific event listener
        removeEvent(element, eventType, callback) {
            if (element.removeEventListener) {
                element.removeEventListener(eventType, callback, false);
            } else if (element.detachEvent) {
                element.detachEvent("on" + eventType, callback);
            }

            // Remove the listener from the internal array
            this.eventListeners = this.eventListeners.filter(listener =>
                listener.element !== element ||
                listener.eventType !== eventType ||
                listener.callback !== callback
            );
        }

        // Method to remove all event listeners added by this manager
        removeAllEvents() {
            this.eventListeners.forEach(({ element, eventType, callback }) => {
                element.removeEventListener(eventType, callback, false);
            });

            // Clear the stored listeners
            this.eventListeners = [];
        }

        customEvent(element, eventType, detail) {
            const customEvent = new CustomEvent(eventType, {
                detail: detail,
                bubbles: true,
                cancelable: true,
                view: win
            });

            // Dispatch the event on the document or any other element
            element.dispatchEvent(customEvent);
        }

        fireEvent(element, eventType = 'click') {
            const event = new Event(eventType, { bubbles: true });
            // Trigger the event
            element.dispatchEvent(event);
        }
    }


    class TypeChecker {
        // Check if the element is an Object (excluding Array)
        static isObject(value) {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        }

        // Check if the element is an Array
        static isArray(value) {
            return Array.isArray(value);
        }

        // Check if the element is a Boolean
        static isBoolean(value) {
            return typeof value === 'boolean';
        }

        // Check if the element is a Number (excluding NaN and Infinity)
        static isNumber(value) {
            return typeof value === 'number' && isFinite(value);
        }

        // Check if the element is a String
        static isString(value) {
            return typeof value === 'string';
        }

        // Generic method to check the type and return it
        static getType(value) {
            if (this.isObject(value)) return 'Object';
            if (this.isArray(value)) return 'Array';
            if (this.isBoolean(value)) return 'Boolean';
            if (this.isNumber(value)) return 'Number';
            if (this.isString(value)) return 'String';
            return 'Unknown Type';
        }
    }

    class Utils {
        static deepClone(json) {
            return JSON.parse(JSON.stringify(json))
        }

        static generateUniqueId(length = 10) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let uniqueId = '';

            for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                uniqueId += characters[randomIndex];
            }

            return uniqueId;
        }

        static objectConvertToDotNotation(obj, parentKey = '', result = {}) {
            for (let key in obj) {
                // Construct the dot notation key
                const dotKey = parentKey ? `${parentKey}.${key}` : key;

                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    // Recursively handle nested objects
                    Utils.objectConvertToDotNotation(obj[key], dotKey, result);
                } else {
                    // Assign value to result in dot notation format
                    result[dotKey] = obj[key];
                }
            }
            return result;
        }

        static dotNotationStringToJSON(dotString, value) {
            const result = {};

            if (!dotString) {
                return result;
            }
            const keys = dotString.split('.'); // Split the dot notation string into keys

            keys.reduce((acc, currentKey, index) => {
                // If this is the last key, assign the value
                if (index === keys.length - 1) {
                    acc[currentKey] = value;
                } else {
                    // If the key doesn't exist, create an empty object
                    if (!acc[currentKey]) {
                        acc[currentKey] = {};
                    }
                }
                return acc[currentKey]; // Return the nested object for the next iteration
            }, result);

            return result;
        }

        static deepMerge(obj1, obj2) {
            const result = { ...obj1 }; // Create a shallow copy of obj1

            for (let key in obj2) {
                if (obj2.hasOwnProperty(key)) {
                    // If both values are objects, merge them recursively
                    if (typeof obj2[key] === 'object' && obj2[key] !== null && !Array.isArray(obj2[key])) {
                        result[key] = Utils.deepMerge(result[key] || {}, obj2[key]);
                    } else {
                        // Otherwise, assign obj2's value to obj1
                        result[key] = obj2[key];
                    }
                }
            }
            return result;
        }

        static getCookie(name) {
            const nameEQ = name + "=";
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                let cookie = cookies[i].trim();
                if (cookie.indexOf(nameEQ) === 0) {
                    return cookie.substring(nameEQ.length, cookie.length);
                }
            }
            return null;
        }

        static setCookie(name, value, days = 7, path = '/') {
            let expires = '';
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = `; expires=${date.toUTCString()}`;
            }
            document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=${path}`;
        }


        static deleteCookie(name) {
            document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }

        static isEmpty(value) {
            return (
                value === undefined ||
                value === null ||
                (typeof value === 'string' && value.trim() === '') ||  // Check for empty string
                (Array.isArray(value) && value.length === 0) ||        // Check for empty array
                (typeof value === 'object' && Object.keys(value).length === 0 && value.constructor === Object) // Check for empty object
            );
        }

        static getImagePlaceholder(name, length = 2) {
            const words = name.trim().split(' ');
            if (length <= 0) {
                throw new Error("Length must be a positive integer.");
            }

            if (words.length > 1) {
                return words[0][0].toUpperCase() + words[1][0].toUpperCase().slice(0, length - 1);
            } else {
                return words[0].slice(0, length).toUpperCase();
            }
        }

    }

    win.$dom = dom;
    win.$http = http;
    win.$event = new EventManager();
    win.utils = Utils;
    win.$Is = TypeChecker

    // console.log("************** LIBRARY END ******************")

})();