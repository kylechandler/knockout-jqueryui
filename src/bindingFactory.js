/*global ko, $*/
/*jslint maxlen:256*/
(function () {
    'use strict';

    var filterProperties, unwrapProperties, setOption, subscribeToObservableOptions, subscribeToRefreshOn,
        create;

    filterProperties = function (source, properties) {
        /// <summary>Filters the properties of an object.</summary>
        /// <param name='source' type='Object'></param>
        /// <param name='properties' type='Array' elementType='String'></param>
        /// <returns type='Object'>A new object with the specified properties copied from source.</returns>

        var result = {};

        ko.utils.arrayForEach(properties, function (property) {
            if (source[property] !== undefined) {
                result[property] = source[property];
            }
        });

        return result;
    };

    unwrapProperties = function (obj) {
        /// <summary>Returns a new object with obj's unwrapped properties.</summary>
        /// <param name='obj' type='Object'></param>
        /// <returns type='Object'></returns>

        var result, prop;

        result = {};

        for (prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                if (ko.isObservable(obj[prop])) {
                    result[prop] = obj[prop].peek();
                } else {
                    result[prop] = obj[prop];
                }
            }
        }

        return result;
    };

    setOption = function (widgetName, element, optionName, observableOrValue) {
        /// <summary>Sets an option on the widget.</summary>
        /// <param name='widgetName' type='String'>The widget's name.</param>
        /// <param name='element' type='DOMNode'></param>
        /// <param name='optionName' type='String'>The option to set.</param>
        /// <param name='observableOrValue'>The option's value or an observable containing the value.</param>

        $(element)[widgetName]('option', optionName, ko.utils.unwrapObservable(observableOrValue));
    };

    subscribeToObservableOptions = function (widgetName, element, options) {
        /// <summary>Creates a subscription to each observable option.</summary>
        /// <param name='widgetName' type='String'>The widget's name.</param>
        /// <param name='element' type='DOMNode'></param>
        /// <param name='options' type='Array'></param>

        var prop;

        for (prop in options) {
            if (options.hasOwnProperty(prop) && ko.isObservable(options[prop])) {
                ko.computed({
                    // moved to a separate function to make jslint happy
                    read: setOption.bind(this, widgetName, element, prop, options[prop]),
                    disposeWhenNodeIsRemoved: element
                });
            }
        }
    };

    subscribeToRefreshOn = function (widgetName, element, bindingValue) {
        /// <summary>Creates a subscription to the refreshOn observable.</summary>
        /// <param name='widgetName' type='String'>The widget's name.</param>
        /// <param name='element' type='DOMNode'></param>
        /// <param name='bindingValue' type='Object'></param>

        if (ko.isObservable(bindingValue.refreshOn)) {
            ko.computed({
                read: function () {
                    bindingValue.refreshOn();
                    $(element)[widgetName]('refresh');
                },
                disposeWhenNodeIsRemoved: element
            });
        }
    };

    create = function (options) {
        /// <summary>Creates a new binding.</summary>
        /// <param name='options' type='Object'></param>

        var widgetName, init;

        widgetName = options.name;

        // skip missing widgets
        if ($.fn[widgetName]) {
            /*jslint unparam:true*/
            init = function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

                var flag, value, widgetOptions, widgetOptionsAndEvents;

                // prevent multiple inits
                flag = 'ko_' + widgetName + '_initialized';
                if (!element[flag]) {

                    value = valueAccessor();
                    widgetOptions = filterProperties(value, options.options);
                    widgetOptionsAndEvents = filterProperties(value, options.options.concat(options.events));

                    // execute the provided callback before the widget initialization
                    if (options.preInit) {
                        options.preInit.apply(this, arguments);
                    }

                    // allow inner elements' bindings to finish before initializing the widget
                    ko.applyBindingsToDescendants(bindingContext, element);

                    // initialize the widget
                    $(element)[widgetName](unwrapProperties(widgetOptionsAndEvents));

                    subscribeToObservableOptions(widgetName, element, widgetOptions);

                    if (options.hasRefresh) {
                        subscribeToRefreshOn(widgetName, element, value);
                    }

                    // store the widget instance in the widget observable
                    if (ko.isWriteableObservable(value.widget)) {
                        value.widget($(element)[widgetName]('widget'));
                    }

                    // handle disposal
                    ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                        $(element)[widgetName]('destroy');
                        delete element[flag];
                    });

                    // execute the provided callback after the widget initialization
                    if (options.postInit) {
                        options.postInit.apply(this, arguments);
                    }

                    element[flag] = true;
                }

                // the inner elements have already been taken care of
                return { controlsDescendantBindings: true };
            };
            /*jslint unparam:false*/

            ko.bindingHandlers[widgetName] = {
                init: init
            };
        }
    };

    ko.jqueryui = ko.jqueryui || {};

    ko.jqueryui.bindingFactory = {
        create: create
    };
}());