/**
 * Created by Maximilian Koch (mkoch@ebi.ac.uk).
 */


(function () {
    var ELEXIR_ACCORDION_CONTAINER;
    var REGISTRY_URL;
    var LOCALSTORAGE_LIFETIME;
    var LOADING_BAR_GIF;
    var LOADING_BAR_ELEMENT_ID;

    $.fn.smk_Accordion = function (options) {

        if (this.length > 1) {
            this.each(function () {
                $(this).smk_Accordion(options);
            });
            return this;
        }

        // Defaults
        var settings = $.extend({
            animation: true,
            showIcon: true,
            closeAble: false,
            closeOther: true,
            slideSpeed: 150,
            activeIndex: false
        }, options);

        if ($(this).data('close-able'))    settings.closeAble = $(this).data('close-able');
        if ($(this).data('animation'))     settings.animation = $(this).data('animation');
        if ($(this).data('show-icon'))     settings.showIcon = $(this).data('show-icon');
        if ($(this).data('close-other'))   settings.closeOther = $(this).data('close-other');
        if ($(this).data('slide-speed'))   settings.slideSpeed = $(this).data('slide-speed');
        if ($(this).data('active-index'))  settings.activeIndex = $(this).data('active-index');

        // Cache current instance
        // To avoid scope issues, use 'plugin' instead of 'this'
        // to reference this class from internal events and functions.
        var plugin = this;

        //"Constructor"
        var init = function () {
            plugin.createStructure();
            plugin.clickHead();
        };

        // Add .smk_accordion class
        this.createStructure = function () {

            //Add Class
            plugin.addClass('smk_accordion');
            if (settings.showIcon) {
                plugin.addClass('acc_with_icon');
            }

            //Create sections if they were not created already
            if (plugin.find('.accordion_in').length < 1) {
                plugin.children().addClass('accordion_in');
            }

            //Add classes to accordion head and content for each section
            plugin.find('.accordion_in').each(function (index, elem) {
                var childs = $(elem).children();
                $(childs[0]).addClass('accordion_head');
                $(childs[1]).addClass('accordion_content');
            });

            //Append icon
            if (settings.showIcon) {
                plugin.find('.accordion_head').prepend('<div class="acc_icon_expand"></div>');
            }

            //Hide inactive
            plugin.find('.accordion_in .accordion_content').not('.acc_active .accordion_content').hide();

            //Active index
            if (settings.activeIndex === parseInt(settings.activeIndex)) {
                if (settings.activeIndex === 0) {
                    plugin.find('.accordion_in').addClass('acc_active').show();
                    plugin.find('.accordion_in .accordion_content').addClass('acc_active').show();
                }
                else {
                    plugin.find('.accordion_in').eq(settings.activeIndex - 1).addClass('acc_active').show();
                    plugin.find('.accordion_in .accordion_content').eq(settings.activeIndex - 1).addClass('acc_active').show();
                }
            }

        };

        // Action when the user click accordion head
        this.clickHead = function () {

            plugin.on('click', '.accordion_head', function () {

                var s_parent = $(this).parent();

                if (s_parent.hasClass('acc_active') == false) {
                    if (settings.closeOther) {
                        plugin.find('.accordion_content').slideUp(settings.slideSpeed);
                        plugin.find('.accordion_in').removeClass('acc_active');
                    }
                }

                if (s_parent.hasClass('acc_active')) {
                    if (false !== settings.closeAble) {
                        s_parent.children('.accordion_content').slideUp(settings.slideSpeed);
                        s_parent.removeClass('acc_active');
                    }
                }
                else {
                    $(this).next('.accordion_content').slideDown(settings.slideSpeed);
                    s_parent.addClass('acc_active');
                }

            });

        };

        //"Constructor" init
        init();
        return this;

    };

    var filterELIXIRTools = function (tools) {
        return tools.filter(
            function (value) {
                return (typeof value.elixirInfo !== 'undefined');
            });

    };

    var getAllNodes = function (tools) {
        var nodes = [];
        for (var index = 0; index < tools.length; index++) {
            nodes.push(tools[index].elixirInfo.elixirNode);
        }
        nodes = sortByAlphabet(nodes);
        nodes = removeDuplicates(nodes);
        return nodes;
    };

    var sortByAlphabet = function (nodes) {
        return nodes.sort();
    };

    var removeDuplicates = function (nodes) {
        return nodes.filter(function (item, index, inputArray) {
            return inputArray.indexOf(item) == index;
        });
    };


    var createMapToolByNode = function (nodes, tools) {
        var mappedTools = {};
        for (var index = 0; index < nodes.length; index++) {
            mappedTools[nodes[index]] = tools.filter(
                function (value) {
                    var test = value.elixirInfo.elixirNode;
                    return (value.elixirInfo.elixirNode === nodes[index]);
                }
            );
        }
        return mappedTools;
    };

    /*
     * Public Methods
     */

    var processELIXIRTools = function (rawTools) {
        //var rawTools = requestELIXIRTools();
        var tools = filterELIXIRTools(rawTools);
        var nodes = getAllNodes(tools);
        var mappedTools = createMapToolByNode(nodes, tools);
        if (getLocalStorage() !== null) {
            if (JSON.stringify(getLocalStorage().info) === JSON.stringify(mappedTools)) {

            }
        }
        createHTML(mappedTools);
    };

    function doRequest() {
        $.ajax({
            url: REGISTRY_URL,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                processELIXIRTools(data);
            },
            error: function (data) {
                //todo Display a link to the registry.
                throw new Error('Could not request data form registry(' + REGISTRY_URL + ') STATUS: ' + code);
            }
        });
    }

    function createHTML(mappedTools) {
        $(ELEXIR_ACCORDION_CONTAINER).empty().append('<div class="accordion"></div>');
        for (var i = 0; i < Object.keys(mappedTools).length; i++) {
            $('.accordion').append(generateAccordionInDIV(mappedTools, i));
            $('.accordion_in#' + Object.keys(mappedTools)[i].replace(/ /g, ''))
                .append(generateAccordionHeadDIV(mappedTools, i))
                .append(generateAccordionContentDIV(mappedTools, i));
            $('.accordion_content#' + Object.keys(mappedTools)[i].replace(/ /g, '')).append(generateAccordionContentTable(mappedTools, i));
            for (var e = 0; e < mappedTools[Object.keys(mappedTools)[i]].length; e++) {
                $('.accordion_content_table#' + Object.keys(mappedTools)[i].replace(/ /g, '')).append(genereateToolContent());
            }
        }
        setLocalStorage(mappedTools);
        callSMK_Accordion();

        function generateAccordionHeadDIV(mappedTools, i) {
            //return '<div class="accordion_head">' + Object.keys(mappedTools)[i] + '\t\t\t(' + Object.keys(mappedTools)[i].length + ')</div>';
            return '<div class="accordion_head">' + Object.keys(mappedTools)[i] + '</div>';
        }

        function generateAccordionInDIV(mappedTools, i) {
            return '<div class="accordion_in" id=' + Object.keys(mappedTools)[i].replace(/ /g, '') + '></div>';
        }

        function generateAccordionContentDIV(mappedTools, i) {
            return '<div class="accordion_content" id=' + Object.keys(mappedTools)[i].replace(/ /g, '') + '></div>';

        }

        function generateAccordionContentTable(mappedTools, i) {
            return '<div><table class="accordion_content_table" id=' + Object.keys(mappedTools)[i].replace(/ /g, '') + '></table></div>';

        }

        function generateToolHeader(i) {
            return '<tr><td><h3><a href="' + i.homepage + '" target="_blank">' + i.name + '</a></h3></td></tr>';
        }

        function generateToolDescription(i) {
            return '<tr><td><div class="accordion_content_tag">Description:</div></td><td>' + i.description + ' </div></td></tr>';
        }

        function genereateToolContent() {
            return generateToolHeader(mappedTools[Object.keys(mappedTools)[i]][e]) + generateToolDescription(mappedTools[Object.keys(mappedTools)[i]][e]);

        }
    }

    function callSMK_Accordion() {
        $(".accordion").smk_Accordion({
            closeAble: true //boolean
        });
    }

    function setLocalStorage(obj) {
        var objToSave = {};
        objToSave.timeStamp = Date.now();
        objToSave.info = obj;
        localStorage.removeItem('ELIXIRSimpleServicesView');
        localStorage.setItem('ELIXIRSimpleServicesView', JSON.stringify(objToSave));
    }

    function getLocalStorage() {
        return JSON.parse(localStorage.getItem('ELIXIRSimpleServicesView'));
    }

    function localStorageIsValid() {
        var savedObj = getLocalStorage();
        if (savedObj !== null) {
            var timeDifference = Date.now() - savedObj.timeStamp;
            if (timeDifference < LOCALSTORAGE_LIFETIME) {
                return true;
            }
        }
        return false;
    }

    function createLoadingBar() {
        var loadingBar = new Image();

        loadingBar.src = LOADING_BAR_GIF;
        loadingBar.id = LOADING_BAR_ELEMENT_ID;
        loadingBar.alt = "Loading...";

        $(ELEXIR_ACCORDION_CONTAINER).append(loadingBar);
    }

    function removeLoadingBar() {
        document.getElementById(LOADING_BAR_ELEMENT_ID).remove();
    }

    function main() {
        ELEXIR_ACCORDION_CONTAINER = document.getElementById('elixir_services_accordion');
        if (ELEXIR_ACCORDION_CONTAINER.length === 0) {
            throw new Error('No element with class name "elixir_accordion_container" found.');
        }
        if (!window.jQuery) {
            throw new Error('Could not find jQuery. Version 1.1.3 is requiered.');
        }
        REGISTRY_URL = ELEXIR_ACCORDION_CONTAINER.dataset.registryUrl;
        LOCALSTORAGE_LIFETIME = ELEXIR_ACCORDION_CONTAINER.dataset.localStorageLifetime;
        LOADING_BAR_GIF = ELEXIR_ACCORDION_CONTAINER.dataset.loadingBar;
        LOADING_BAR_ELEMENT_ID = ELEXIR_ACCORDION_CONTAINER + "_loadingBar";

        if (REGISTRY_URL === undefined) {
            throw new Error('Could not find registry url. Please provide registry URL. Example: data-registry-url="www.registry-url.org/api/tools"');
        }
        if (LOCALSTORAGE_LIFETIME === undefined) {
            throw new Error('Could not find lifetime for localstorage. Please provide a lifetime in ms');
        }

        createLoadingBar();

        if (localStorageIsValid()) {
            var savedObj = getLocalStorage();
            createHTML(savedObj.info);
            doRequest();
        } else {
            doRequest();
        }
    }

    window.onload = function () {
        main()
    }
})();


