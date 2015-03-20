define([
    'backbone',
    'lazyload',
    'text!templates/itemTemplate.html',
    'text!templates/modalTemplate.html',
    'text!templates/headerTemplate.html',
    'text!templates/footerTemplate.html',
], function(
    Backbone, 
    lazyload,
    itemTmpl,
    modalTmpl,
    headerTmpl,
    footerTmpl
) { 
   'use strict';

    var itemCollection,
        headingText = {title: 'Immigrants in their own words <span class="headline-highlight">100 stories</span>',
                       subheading: 'Earlier this year, the Guardian asked immigrants living in Britain to tell us about their experiences. What follows are the voices of people who have come to the country, by choice or through circumstance. These are their stories.'},
        noticeboardID = '54d891e9e4b045255634008f',
        isWeb = typeof window.guardian === "undefined" ? false : true,
        sortIDs = ['1433041', '1414116', '1414089', '1412813', '1406807', '1412847', '1393388', '1412841', '1414107', '1414097', '1414112', '1375728', '1414120', '1420599', '1422203', '1426038', '1433161', '1433182', '1433016', '1433051', '1433093', '1433131', '1433135', '1412810', '1433136', '1432899', '1432913', '1432964', '1433141', '1412817'];

    // FOR TESTING:
    isWeb = true;
    // Remove ^

    function init() {
        var Item = Backbone.Model.extend();

        var ItemList = Backbone.Collection.extend({
            model: Item,
            url: 'http://n0ticeapis.com/2/search?noticeboard='+ noticeboardID + '&limit=100&votedInterestingBy=RosieSwash',
            sync : function(method, collection, options) {
                options.dataType = "jsonp";
                options.cache = true;
                options.jsonpCallback = "witnessVisuals";
                return Backbone.sync(method, collection, options);
            },
            parse: function(resp) {
                return resp.results;
            }
        });

        var ModalItem = Backbone.Collection.extend({
            model: Item
        });

        var ModalView = Backbone.View.extend({
            template: _.template(modalTmpl),
            initialize: function() {
                $('.element-interactive').after('<div class="overlay__container"><div class="overlay__body"></div></div>');
            },
            render: function() {
                var modalTemplate = this.template({data: this.model.models[0].toJSON(), noticeboard: noticeboardID});
                $('.overlay__body').html(modalTemplate);
                $('.overlay__container').addClass('overlay__container--show');
                $('body').addClass('dropdown-open');

                return this;
            },

            addNavAtts: function(itemID) {
                this.model.shift();
                this.model.unshift(items.where({ id: 'report/' + itemID }));

                var indexPos = _.indexOf(items.models, items.where({ id: 'report/' + itemID })[0]);
                
                if(items.at(indexPos+1)) {
                    this.model.models[0].set('nextItem', items.at(indexPos+1).attributes.id.substring(7));
                }

                if(items.at(indexPos-1)) {
                    this.model.models[0].set('prevItem', items.at(indexPos-1).attributes.id.substring(7));
                }

                this.render();
            }
        });

        var modal = new ModalItem,
            modalView = new ModalView({model: modal});

        var ItemsView = Backbone.View.extend({
            template: _.template(itemTmpl),
            initialize: function() {
                this.setElement('<div class="main"></div>');
            },
            render: function() {
                var that = this,
                    perRow = 4,
                    counter = 0, 
                    sliced,
                    toMove;

                sortIDs.reverse().map(function(id) {
                    var toAdd = that.model.where({ id: 'report/' + id });
                    that.model.remove(toAdd);
                    that.model.unshift(toAdd);
                });

                // reorder collection to avoid gaps in the grid
                if($(document).width() > 980) {
                    _.each(this.model.models, function(item, i) {
                        if(item.attributes.updates[0].hasOwnProperty('image')) {
                            if(item.attributes.updates[0].image.orientation == 'landscape') {
                                counter += 2;
                            } else {
                                counter += 1;
                            }
                        } else {
                            counter += 1;
                        }

                        if(counter == perRow + 1) {
                            console.log(i);
                            sliced = _.filter(items.slice(i, items.length), function (item) {
                                return (item.attributes.updates[0].hasOwnProperty('image') && item.attributes.updates[0].image.orientation === 'portrait') || !item.attributes.updates[0].hasOwnProperty('image');
                            });
                            if(sliced.length > 0) {
                                toMove = that.model.where({id: sliced[0].attributes.id});
                                that.model.remove(toMove);
                                that.model.add(toMove, {at: i});
                            }
                            counter = 0;
                        } else if(counter == perRow) {
                            counter = 0;
                        }
                    });
                }

                _.each(this.model.models, function(item){
                    var itemTemplate = this.template({item: item.toJSON(), trunc: trunc});
                    var $template = $(itemTemplate);

                    $template.appendTo(this.el);
                }, this);

            return this;
            }
        });

        var items = new ItemList;

        var AppView = Backbone.View.extend({
            render: function(){
                var itemsView = new ItemsView({model:items}),
                    html = itemsView.render().el,
                    headerTemplate = _.template(headerTmpl),
                    headerHTML = headerTemplate({
                        headingText: headingText,
                        isWeb: isWeb, 
                        noticeboard: noticeboardID
                    }),
                    footerTemplate = _.template(footerTmpl),
                    footerHTML = footerTemplate({
                        isWeb: isWeb
                    });

                $('.element-interactive').html(html);
                $('.main').before(headerHTML).after(footerHTML);

                // This adjusts the ordering to get rid of any gaps
                // $('.item--landscape').each(function(i, item) {
                //     var $item = $(item);
                //     if($item.position().left === 0) {
                //         var itemToMove = $item.nextAll(".item--thin").first().detach();
                //         $item.before(itemToMove);
                //     }
                // });

                $('div.background-image').lazyload({
                    effect : "fadeIn",
                    effectspeed: 100
                });

                return this;
            },

            initialize: function(){
                var fetchOptions = {};
                fetchOptions.success = this.render;
                fetchOptions.dataType = "jsonp";
                items.fetch(fetchOptions).complete(function() {
                    initRouter();
                });
            }
        });

        var App = new AppView;

        var AppRouter = Backbone.Router.extend({
            routes: {
                "item-*itemID": "modalRoute",
                "*actions": "closeRoute"
            }
        });

        function initRouter() {
            var app_router = new AppRouter;

            app_router.on('route:modalRoute', function(itemID) {
                if(itemID !== null) {
                    modalView.addNavAtts(itemID);
                }
            });

            app_router.on('route:closeRoute', function() {
                $('.overlay__container').removeClass('overlay__container--show');
                $('body').removeClass('dropdown-open');
            });

            Backbone.history.start();
        }
    }

    function trunc(text, limit) {
        var textSubstr = text.substr(0,limit),
            firstSentence = textSubstr.substr(0, textSubstr.lastIndexOf('.'));

        if (firstSentence) {
            return firstSentence + '.';
        } else {
            return textSubstr + '...';
        }
    }

    return {
        init: init
    };
});
