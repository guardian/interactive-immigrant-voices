define([
    'backbone',
    'lazyload',
    'text!templates/itemTemplate.html',
    'text!templates/modalTemplate.html',
    'text!templates/headerTemplate.html',
    'text!templates/footerTemplate.html'
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
                       subheading: 'What pushed them away from their first homes, what pulled them to these shores, what new lives are they making in Britain? The Guardian asked immigrants living in the UK to tell us about their experiences. These are their stories<div class="link">The Guardian’s immigration special: <a href="http://gu.com/p/46qgd" target="_blank">introduction by Jonathan Freedland</a></div>'},
        noticeboardID = '54d891e9e4b045255634008f',
        isWeb = typeof window.guardian === "undefined" ? false : true,
        sortIDs = ['1433041', '1414116', '1414089', '1406807', '1393388', '1441027', '1412847', '1412841', '1414107', '1441032', '1414112', '1375728', '1414120', '1442681', '1422203', '1441020', '1426038', '1441035', '1433182', '1441024', '1433051', '1441029', '1412813', '1414097', '1412810', '1432899', '1432913', '1432964', '1441039', '1412817'],
        lastModal;

    function init() {
        var Item = Backbone.Model.extend();

        var ItemList = Backbone.Collection.extend({
            model: Item,
            url: 'http://n0ticeapis.com/2/search?noticeboard='+ noticeboardID + '&limit=100&votedInterestingBy=RosieSwash,Jholder112233',
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
                $(document).on('keydown', this.keydown);
                $('.element-interactive').after('<div class="overlay__container"><div class="overlay__body"></div></div>');
            },
            render: function() {
                var modalTemplate = this.template({data: this.model.models[0].toJSON(), noticeboard: noticeboardID});
                $('.overlay__body').html(modalTemplate);
                $('body').scrollTop(0);
                $('.overlay__container').addClass('overlay__container--show');
                $('html').addClass('dropdown-open');
                
                if(location.replace && window.history && window.history.back) {
                    $('.nav-icon--next, .nav-icon--prev').click(function(e) { 
                        e.preventDefault();
                        location.replace(e.currentTarget.hash);
                    });
      
                    $('.nav-icon--close').click(function(e) {
                        e.preventDefault(); 
                        window.history.back();
                    });
                }

                return this;
            },
            keydown: function(event) {
                var e = window.event;

                if (e.keyCode == 39 && window.location.hash.substring(0,5) == '#item' && modalView.model.models[0].attributes.nextItem) {
                    window.location.hash = 'item-' + modalView.model.models[0].attributes.nextItem;
                }

                if (e.keyCode == 37 && window.location.hash.substring(0,5) == '#item' && modalView.model.models[0].attributes.prevItem) {
                    window.location.hash = 'item-' + modalView.model.models[0].attributes.prevItem;
                }
            },
            addNavAtts: function(itemID) {
                this.model.shift();
                this.model.unshift(items.where({ id: 'report/' + itemID }));

                var indexPos = _.indexOf(items.models, items.where({ id: 'report/' + itemID })[0]);

                this.model.models[0].set('position', (indexPos+1));
                
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

                $(window).scroll(_.debounce(function(){
                    if($(window).scrollTop() > 0) {
                        var $back = $('.back-to-top')
                        $back.addClass('back-to-top--scrolled');
                        $back.click(function(e) { 
                            window.scrollTo(0,0);
                        });
                    } else {
                        $('.back-to-top').removeClass('back-to-top--scrolled');
                    }
                }, 250));

                $('div.background-image').lazyload({
                    effect : "fadeIn",
                    effectspeed: 250,
                    threshold : 750
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
                    lastModal = itemID;
                    modalView.addNavAtts(itemID);
                }
            });

            app_router.on('route:closeRoute', function() {
                $('.overlay__container').removeClass('overlay__container--show');
                $('html').removeClass('dropdown-open');

                if(lastModal) {
                    window.scrollTo(0,$('#item-' + lastModal + '').offset().top);
                }
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
