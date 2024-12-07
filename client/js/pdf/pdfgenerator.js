(function (global) {
    class PdfManager {
        constructor() {
            this.g_account_key = 'g_account_created';
            this.accessTokenAPI = "/api/accounts/check-access-token";
            this.is_editor = location.pathname.includes('pdf-editor')
            this.initPDF()
            this.bindPDFEvents();
            this.renderTemplate();
        }

        bindPDFEvents() {
            const gSignIn = $dom.getId('google_siginin');
            const saveButton = $dom.getId('save_template');
            const form = $dom.getId('pdfform');
            if (saveButton) {
                $event.bindEvent(saveButton, 'click', this.saveTemplate.bind(this));
            }
            $event.bindEvent(form, 'submit', this.createPDFRequest.bind(this));
            $event.bindEvent(form, 'click', this.deleteField.bind(this));
            $event.bindEvent(gSignIn, 'click', this.initGoogleAuth);
        }

        initPDF() {
            const _this = this;
            const gSignIn = $dom.getId('google_siginin');

            if (localStorage.getItem(this.g_account_key)) {
                $dom.addClass(gSignIn, 'hidden');

                const profile = $dom.getElement('[data-top-bar="profile"]');

                $dom.removeClass(profile, 'hidden');

            } else {
                $http.get({
                    url: this.accessTokenAPI,
                    handler: function (response) {
                        const accResponse = JSON.parse(response);

                        if (accResponse.tokenValid) {
                            localStorage.setItem(_this.g_account_key, true);
                            $dom.addClass(gSignIn, 'hidden');

                        }
                    },
                    error: function (response) {
                        console.error("Error", response)
                    }
                })
            }
        }

        initGoogleAuth() {
            const redirectUrl = location.origin + '/api/accounts/google';

            google.accounts.oauth2.initCodeClient({
                client_id: '1000372651631-89i8ln7h698pldu0689id395vg2var8u.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                ux_mode: 'redirect',
                redirect_uri: redirectUrl,
                callback: (response) => {
                    // This callback will not fire due to redirect mode; the server will handle the response.
                }
            }).requestCode();
        }

        renderTemplate() {
            const _this = this;
            const headers = {
                "Content-Type": "application/json",
            }

            $http.get({
                url: '/api/pdf/template',
                headers,
                handler: function (response) {
                    const res = JSON.parse(response);
                    $dom.getId('template_content').textContent = res.template;

                    _this.renderFields(res.fields);

                },
                error: function (response) {
                    console.error(resData);
                }
            })
        }

        createPDFRequest(event) {
            event.preventDefault();

            const _this = this;

            const isValid = this.validateForm();

            const mask = $dom.getId('mask');
            mask.style.display = 'flex';

            const { format_type, ...fieldData } = this.captureFormData();

            if (Object.keys(fieldData).length == 0) {
                return;
            }

            template.execute({
                template_id: 'pdfcontent',
                models: {
                    data: fieldData
                },
                target_id: 'pdfpreviewelement',
                insert_type: 'innerHTML',
                callback: (data) => {

                    let templateData = data.html.innerHTML;
                    if (format_type == 'docx') {
                        templateData = templateData.replace(/<div class="pdf-template">\s*/, ''); // Remove opening <div> with class
                        templateData = templateData.replace(/\s*<\/div>$/, ''); // Remove closing </div>
                    }

                    const bodyJSON = {
                        form: templateData,
                        format_type
                    }

                    const headers = {
                        "Content-Type": "application/json",
                    }

                    $http.post({
                        url: '/api/pdf',
                        headers,
                        bodyJSON,
                        async: true,
                        handler: function (response) {

                            const filePath = JSON.parse(response).pdf_path
                            const spl = filePath.split('/');
                            const downFileName = spl[spl.length - 1];

                            if (format_type == 'pdf') {
                                _this.previewPDF(filePath, downFileName);
                            } else {
                                //docs file download
                                _this.downloadFile(filePath, downFileName);
                            }

                        },
                        error: function (response) {
                            mask.style.display = '';

                            var resData = JSON.parse(response);
                            console.error(resData);
                        }
                    })

                }
            })
        }

        validateForm() {
            return true;
        }

        captureFormData() {
            let obj = {};

            Array.from($dom.getElements('[data-field]')).forEach(element => {
                obj[element.name] = element.value
            });

            return obj;
        }

        previewPDF(pdfPath, downFileName) {
            const _this = this;
            //remove mask
            const mask = $dom.getId('mask');
            mask.style.display = '';

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                this.downloadFile(pdfPath, downFileName);
                return;
            }

            // Show the modal and display the PDF in the iframe
            const modal = document.getElementById('pdfPreviewModal');
            const iframe = document.getElementById('pdfPreviewFrame');
            iframe.src = pdfPath;
            modal.style.display = 'block';

            // Handle Download button click
            document.getElementById('downloadPdfButton').addEventListener('click', () => {
                _this.downloadFile(pdfPath, downFileName);
            });

            // Handle Cancel button click
            document.getElementById('cancelPreviewButton').addEventListener('click', () => {
                modal.style.display = 'none';
                iframe.src = ''; // Clear the iframe content
            });

        }

        downloadFile(filePath, downFileName) {
            const link = document.createElement('a');
            link.href = filePath;
            link.download = downFileName;
            link.click();
        }

        saveTemplate() {

            const headers = {
                "Content-Type": "application/json",
            }

            $http.post({
                url: '/api/pdf/template',
                headers,
                bodyJSON: {
                    template: $dom.getId('template_content').value,
                },
                handler: function (response) {
                    alert('Template updated');
                },
                error: function (response) {
                    var resData = JSON.parse(response);
                    console.error(resData);
                }
            })
        }

        addFieldDialog() {
            const _this = this;

            function createField(formData) {

                formData.field_id = utils.generateUniqueId(8);

                const headers = {
                    "Content-Type": "application/json",
                }

                $http.post({
                    url: '/api/pdf/fields',
                    headers,
                    bodyJSON: {
                        field: formData
                    },
                    handler: function (response) {
                        console.log('PDF JSON updated successfully');
                        _this.renderFields(JSON.parse(response).fields);
                    },
                    error: function (response) {
                        var resData = JSON.parse(response);
                        console.error(resData);
                    }
                })
            }

            const fields = [
                {
                    id: 'label',
                    label: 'Field name',
                    type: 'text',
                    validate: 'required'
                },
                {
                    id: 'type',
                    label: 'Field type',
                    type: 'select',
                    values: [
                        'text',
                        'number',
                        'email',
                        // 'select',
                        'textarea'
                    ]
                },
                {
                    id: 'placeholder',
                    label: 'Placeholder',
                    type: 'text'
                },
                {
                    id: 'required',
                    label: 'Required',
                    type: 'toggle'
                },
            ]

            $event.customEvent(document, 'dialog:open', {
                custom_event: true,
                title: 'Editor',
                template: template,
                width: "50",
                height: "75",
                fields,
                next: createField
            });
        }

        renderFields(fields) {

            template.execute({
                template_id: 'pdffields',
                models: {
                    fields,
                    is_editor: this.is_editor
                },
                target_id: 'pdfform',
                insert_type: 'innerHTML',
                callback: (data) => {
                    const addFieldBtn = $dom.getId('addfield');
                    if (addFieldBtn) {
                        $event.bindEvent(addFieldBtn, 'click', this.addFieldDialog.bind(this));
                    }
                }
            })
        }

        deleteField(e) {
            const _this = this;

            const deleteIcon = e.target.closest('[data-field-delete]');
            if (deleteIcon) {
                const fieldId = deleteIcon.getAttribute('data-field-id');

                const headers = {
                    "Content-Type": "application/json",
                }

                $http.delete({
                    url: '/api/pdf/fields/' + fieldId,
                    headers,
                    mask: true,
                    handler: function (response) {
                        const res = JSON.parse(response);
                        _this.renderFields(res.fields);

                    },
                    error: function (response) {
                        var resData = JSON.parse(response);
                        console.error(resData);
                    }
                })

            }
        }
    }

    new PdfManager();
})(window);