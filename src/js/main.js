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
        headingText = {title: 'Immigrants in their own words: 100 stories',
                       subheading: 'Earlier this year, the Guardian asked immigrants living in Britain to tell us about their experiences. What follows are the voices of the people who have come to Britain, by choice or through circumstance, describing their life in the UK and how they feel about the political debate surrounding immigration. These are their stories.'},
        noticeboardID = '54d891e9e4b045255634008f',
        isWeb = typeof window.guardian === "undefined" ? false : true,
        sortIDs = ['1389209', '1376612', '1385299'];

    // FOR TESTING:
    isWeb = true;
    // Remove ^

    function init() {
        var Item = Backbone.Model.extend();

        var ItemList = Backbone.Collection.extend({
            model: Item,
            url: 'http://n0ticeapis.com/2/search?noticeboard='+ noticeboardID + '&limit=100',
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
                // _.bindAll(this, 'render');
                $('.element-interactive').after('<div class="overlay__container"><div class="overlay__body"></div></div>');
            },
            render: function() {
                var modalTemplate = this.template({data: this.model.models[0].toJSON(), noticeboard: noticeboardID});
                $('.overlay__body').html(modalTemplate);
                $('.overlay__container').addClass('overlay__container--show');
                $('body').addClass('dropdown-open');

                return this;
            },
            renderMobile: function(itemID) {
                var $item = $('#item-' + itemID);
                if($item.has('.body').length) {
                    $('#item-' + itemID + ' .body').html(items.where({ id: 'report/' + itemID })[0].attributes.updates[0].body);
                } else {
                    $item.find('.quote').remove();
                    $item.find('.wrapper').prepend('<div class="body">' + items.where({ id: 'report/' + itemID })[0].attributes.updates[0].body + '</div>');
                }
            },
            addNavAtts: function(itemID) {
                if($(document).width() > 740) {
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
                } else {
                    this.renderMobile(itemID);
                }
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
                var that = this;
                sortIDs.reverse().map(function(id) {
                    var toAdd = that.model.where({ id: 'report/' + id });
                    that.model.remove(toAdd);
                    that.model.unshift(toAdd);
                });

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
                $('.item--landscape').each(function(i, item) {
                    var $item = $(item);
                    if($item.position().left === 0 && $item.position().top > 100 ) {
                        var itemToMove = $item.nextAll(".item--thin").first().detach();
                        $item.before(itemToMove);
                    }
                });

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
            return firstSentence + ' ...';
        } else {
            return textSubstr + '...';
        }
    }

    return {
        init: init
    };
});
