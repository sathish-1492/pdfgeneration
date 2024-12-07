(function () {

    //tessss
    class StorageManager {
        constructor() {
            this.accountsAPI = "/api/accounts";
            this.pagesAPI = "/api/builder/pages";
            this.userRegister = "/api/accounts/signup";
            this.userLogin = "/api/accounts/signin";
            this.auth_token_cookie = '_auth_token_';
            this.page_name_key = '_page_name_';
            this.google_account_created = 'g_account_created';
            this.authToken = utils.getCookie(this.auth_token_cookie);
            this.updateElementJSON = this.updateElementJSON.bind(this);
            this.getPayment = this.getPayment.bind(this);
            this.createPaymentOrder = this.createPaymentOrder.bind(this);
            this.getConfigFromDataBase();
            this.bindStorageEvents();
          //  this.getProfileName();
        }

        getConfigFromDataBase() {
            const _this = this;

            if (!localStorage.getItem(this.google_account_created) && window.location.href != '/') {
                return;
            }

            const headers = {
                "Content-Type": "application/json"
            }

            // $http.get({
            //     url: "/api/configurations",
            //     headers,
            //     handler: (response) => {
            //         _this.config = JSON.parse(response);
            //         _this.updateConfigData();
            //     },
            //     error: () => {
            //         _this.getConfig();
            //     }
            // });
        }

        getConfig() {
            var _this = this;
            $http.get({
                url: "json/config.json",
                handler: function (response) {
                    _this.config = JSON.parse(response);
                    _this.updateConfigData();
                },
                error: function (response) {
                    console.error("Error", response)
                }
            })
        }

        getProfileName() {
            const _this = this;
            const prof = $dom.getId('topSetting');

            if (localStorage.getItem(this.google_account_created)) {

                const headers = {
                    "Content-Type": "application/json",
                }

                $http.get({
                    url: this.accountsAPI,
                    headers,
                    handler: function (response) {
                        const accResponse = JSON.parse(response);
                        const profInit = document.getElementById('profile-initials');
                        if (profInit) {
                            profInit.textContent = utils.getImagePlaceholder(accResponse.user_name, 1);
                        }

                        const email = $dom.getId('profile-email');
                        const name = $dom.getId('profile-name');
                        if (name) {
                            name.innerText = accResponse.user_name
                        }
                        if (email) {
                            email.innerText = accResponse.email_id;
                        }

                        _this.email = accResponse.email_id;
                        _this.customer_name = accResponse.user_name;

                        if(typeof gtag !== 'undefined') {
                            gtag('config', 'G-FN869X9L14', {
                                'user_id': accResponse.google_id
                            });
                        }
                       
                    },
                    error: function (response) {
                        console.error("Error", response)
                    }
                })
            } else if (prof) {
                prof.style.display = 'none';
            }
        }

        updateConfigData() {
            this.isStoreServer = this.config.storage && this.config.storage.location == 'server';
            this.localStorageId = this.config.storage.local_storage_key;
            this.auth_token_cookie = this.config.storage && this.config.storage.cookie_name;

            const appNameElm = $dom.getElement('.product-name');
            if (this.config.app_name && appNameElm) {
                appNameElm.innerText = this.config.app_name;
            }

            if (window.location.pathname === '/builder') {
                this.getContent();
            }
        }

        getContent() {
            var _this = this;

            const pageName = localStorage.getItem(this.page_name_key);
            const zoomCanvas = $dom.getElement('[data-zoom]')
            const resolution = $dom.getElement('[data-resolution]')
            const pageCanvas = $dom.getId('canvas');

            if (!pageName && window.location.href != '/') {
                //      window.location.href = '/';
                return;
            }

            const headers = {
                "Content-Type": "application/json",
            }

            // $event.bindEvent(zoomCanvas, 'change', (e) => {
            //     pageCanvas.style.zoom = e.target.value;
            // })

            $event.bindEvent(resolution, 'change', (e) => {

                const changedValue = e.target.value;

                var bodyJson = {
                    page_name: pageName,
                    resolution: changedValue
                }

                $http.put({
                    url: this.pagesAPI,
                    bodyJSON: bodyJson,
                    headers: headers,
                    handler: function (response) {
                        console.info("Info", JSON.parse(response))

                        const size = changedValue.split('x');
                        const zoomValue = '0.80';

                        pageCanvas.style.width = `${size[0]}px`;
                        pageCanvas.style.height = `${size[1]}px`;
                        pageCanvas.style.zoom = zoomValue;

                    },
                    error: function (response) {
                        console.error("Error", response)
                    }
                })


            })



            const params = {
                page_name: pageName
            }

            $http.get({
                url: this.pagesAPI,
                headers,
                params,
                handler: function (response) {
                    const pageResponse = JSON.parse(response);
                    const size = pageResponse.resolution.split('x');

                    // const zoomValue = '0.80';
                    //pageCanvas.style.width = `${size[0]}px`;
                    // pageCanvas.style.zoom = zoomValue;
                    // zoomCanvas.value = zoomValue;

                    if (pageResponse.content) {
                        _this.editor_meta_json = pageResponse.content
                        _this.updateElementCache(_this.editor_meta_json);
                    }

                    $event.bindEvent(document, 'builder:loaded', () => {

                        const elements = $dom.getId('sectionElements');
                        elements.style.width = `${size[0]}px`;
                        elements.style.height = `${size[1]}px`;
                        elements.setAttribute('data-frames', 30)
                        elements.setAttribute('data-duration', pageResponse.duration)

                        builder.setPageName(pageResponse.page_name)
                    });
                },
                error: function (response) {
                    console.error("Error", response)
                    localStorage.removeItem(_this.localStorageId);
                    //window.location.reload();
                }
            })
        }

        getElementJSON() {
            var json = localStorage.getItem(this.localStorageId);
            return json ? JSON.parse(json) : this.defualtContent;
        }

        updateElementJSON(e) {
            var json = e.detail.content;
            this.updateElementCache(JSON.stringify(json), true);
        }

        updateElementCache(jsonString, isServerUpdate = false) {
            localStorage.setItem(this.localStorageId, jsonString);

            if (isServerUpdate && this.isStoreServer) {

                const headers = {
                    "Content-Type": "application/json",
                }

                const bodyJson = {
                    content: jsonString,
                    content_type: 'json'
                };

                const projectId = localStorage.getItem('_project_id_');
                
                let apiUrl;
                if(projectId) {
                    apiUrl = '/api/projects/' + projectId;
                } else {
                    apiUrl = this.pagesAPI;
                    bodyJson.page_name = localStorage.getItem(this.page_name_key)
                }

                $http.put({
                    url: apiUrl,
                    bodyJSON: bodyJson,
                    headers,
                    handler: function (response) {
                        console.info("Element JSON updated to server")
                    },
                    error: function (response) {
                        console.error("Error", response)
                    }
                })
            }


        }

        bindStorageEvents() {
            $event.bindEvent(document, 'store:meta', this.updateElementJSON);
            $event.bindEvent(document, 'payment:dialog:open', this.getPayment);
            $event.bindEvent(window, 'click', this.windowClick.bind(this));
        }

        windowClick(event) {
            const _this = this;

            const dropdownMenu = $dom.getId('top-bar-menu');
            const profileIcon = $dom.getId('topSetting');

            const menu = event.target.closest('[data-top-bar]');
            if (menu) {
                const menuName = menu.getAttribute('data-top-bar');
                if (menuName == 'profile') {

                    if (!$dom.hasClass(dropdownMenu, 'hidden')) {
                        $dom.removeClass(menu, 'selected');
                        $dom.addClass(dropdownMenu, 'hidden');

                    } else {
                        $dom.addClass(menu, 'selected');
                        $dom.removeClass(dropdownMenu, 'hidden');
                    }
                } else if (menuName == 'upgrade') {
                    $dom.addClass(dropdownMenu, 'hidden');
                    $dom.removeClass(profileIcon, 'selected');
                    this.getPayment();
                }
            } else if ($dom.hasClass(event.target, 'profile')) {
                if (event.target.hasAttribute('data-logout')) {
                    //logout api, clear cookie 
                    const headers = {
                        "Content-Type": "application/json",
                    }
                    $http.post({
                        url: '/api/accounts/logout',
                        headers,
                        handler: function (response) {
                            localStorage.removeItem(_this.google_account_created)
                            window.location.href = '/';
                        },
                        error: function (response) {
                            var resData = JSON.parse(response);
                            console.error(resData);
                        }
                    })
                }

                //hide profile menu
                $dom.addClass(dropdownMenu, 'hidden');
                $dom.removeClass(profileIcon, 'selected');

            } else {
                $dom.addClass(dropdownMenu, 'hidden');
                $dom.removeClass(profileIcon, 'selected');
            }
        }


        getPayment() {
            const _this = this;
            const headers = {
                "Content-Type": "application/json",
            }

            $http.get({
                url: '/api/payments',
                headers,
                handler: function (response) {
                    const plan = JSON.parse(response);
                    _this.showPaymentDialog(plan);

                },
                error: function (response) {
                    var resData = JSON.parse(response);
                    console.error(resData);
                }
            })

        }

        showPaymentDialog(payment) {

            if (!$dom.getId('razorpayscript')) {
                const script = document.createElement('script');
                script.id = "razorpayscript";
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                document.head.appendChild(script);
            }

            function filterObject(obj) {
                return Object.entries(obj)
                    .filter(([key, value]) => key !== 'price' && key != 'label')
                    .reduce((acc, [key, value]) => {
                        acc[key] = value; // Rebuild the object
                        return acc;
                    }, {})
            }

            delete payment.plans.free;
            const items = Object.keys(payment.plans).map(planName => {
                const planFeatues = payment.plans[planName];
                return {
                    plan_name: planName,
                    days: planFeatues.days,
                    name: planFeatues.label,
                    price: planFeatues.price,
                    features: filterObject(planFeatues)
                }
            })

            // Sort by days in descending order
            items.sort((a, b) => b.days - a.days);

            const selectedPlan = items[0];

            // Calculate the next due date
            const currentDate = new Date();
            const nextDueDate = new Date(currentDate);
            nextDueDate.setDate(currentDate.getDate() + selectedPlan.days);

            // Format the next due date (e.g., 30 November 2024)
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedNextDueDate = nextDueDate.toLocaleDateString(undefined, options);
            const nextPayment = payment.payments[0] ? payment.payments[0].next_payment_date : '';

            const fields = [
                {
                    name: 'plan_name',
                    label: '',
                    type: 'subscribe',
                    value: selectedPlan.plan_name,
                    price: selectedPlan.price,
                    due_date: formattedNextDueDate,
                    items,
                    next_payment_date: nextPayment,
                    payment_history: payment.payments
                }
            ]


            $event.customEvent(document, 'dialog:open', {
                custom_event: true,
                title: 'Choose your plan',
                width: "50",
                height: "75",
                fields,
                footer: true,
                template: template,
                submit_text: 'Upgrade',
                next: this.createPaymentOrder,
            });

        }

        createPaymentOrder(formData) {
            var _this = this;

            const bodyJSON = formData

            const headers = {
                "Content-Type": "application/json",
            }


            $http.post({
                url: '/api/payments/createOrder',
                bodyJSON,
                headers,
                handler: function (response) {
                    var order = JSON.parse(response);
                    // Proceed to open Razorpay Checkout with the order details
                    _this.openRazorpayCheckout(order);

                },
                error: function (response) {
                    var resData = JSON.parse(response);
                    console.error(resData);
                }
            })
        }

        openRazorpayCheckout(order) {
            const _this = this;

            const email = this.email ? this.email : 'customer@example.com';
            const customerName = this.customer_name ? this.customer_name : 'Customer Name';

            const options = {
                key: 'rzp_test_wMbIcdyFzO7VMh', // Replace with your Razorpay Key ID
                amount: order.amount.toString(),
                currency: order.currency,
                name: 'Thumbnail Maker',
                description: 'Payment for thumbnail services',
                order_id: order.id,
                handler: function (response) {
                    // Step 4: Verify Payment on the Server using XMLHttpRequest
                    _this.verifyPayment(response);
                },
                prefill: {
                    name: customerName,
                    email: email,
                    contact: '9999999999',
                },
                theme: {
                    color: '#3399cc',
                },
            };

            const rzp = new Razorpay(options);
            rzp.open();

        }

        verifyPayment(paymentResponse) {

            const bodyJson = {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
            }


            const headers = {
                "Content-Type": "application/json"
            }

            $http.post({
                url: '/api/payments/verifyPayment',
                bodyJSON: bodyJson,
                headers,
                handler: function (response) {
                    var order = JSON.parse(response);
                    // Proceed to open Razorpay Checkout with the order details
                    console.info('Payment Successful!');

                },
                error: function (response) {
                    var resData = JSON.parse(response);
                    console.error(resData);
                    alert('Payment Verification Failed. Please contact support.');

                }
            })
        }

    }

    new StorageManager();
})();
