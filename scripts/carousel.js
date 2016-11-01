/* These config params must be put in the page including tash.js */
tash.namespace( 'slots.module' );
tash.events.require( 'slots.events.gameCarousel.Initializing' );
tash.events.require( 'slots.events.gameCarousel.Ready' );

/*
usage:
	var carousel = slots.module.Carousel.create( '#mycarousel', {} );
	carousel.<api>

	information needed to build the carousel (only the minimum amount of data possible):

	{
		header: {
			availableGames: 500,  //num of total games in the server for the requested category
			imageBaseUrl: 'http://www.slots2.com/images'   //URL prefix used to fetch the images for the thumbnails
		},

		query: {
			categoryId: 1,
			subcategoryId: 0
			//query used to get this result (so we don't have to cache data on the client)
			//at the moment it contains the ID for the requested category.
		},

		games:[
			{
				id: 12001,
				thumbnail: '12001_thumb.png',		//we are using imageBaseUrl to compose the complete URL
				name: 'Witches and Wizards',
				subcategories: [100,101]			//I expect to have 'All' included in the list for each category
													//this array is related ONLY to the specific category requested in the query.
													//I've no interest in knowing if a game is also part of another category, cause
													//it would be useless until I hit that category (and I'd be getting that game again as a result)
			} // = 50 chars, if minified.  500 games = +-25Kb (< 100k = manageable)
		],

		//I could get all the information about the categories/subcategories in a different service call...
		//dictionary information about categories and subcategories
		categories: [
			{id: 1, name: 'Slots'},
			{id: 2, name: 'Hot Games' }
		],

		//subcategories are ONLY specific to the requested category
		//examples:
		//for cat 1:
		subcategories: [
			{id:100, name: 'All', categoryId: 1 },  //this is always there
			{id:101, name: 'Classic Slots', categoryId: 1 } ]
		//for cat 2:
		subcategories: [
			{id:200, name: 'All', categoryId: 2 },
			{id:201, name: 'New Games', categoryId: 2 },
			{id:202, name: 'Featured', categoryId: 2 }
		]
	}

	//all the games are loaded in meta
	//filtered games will be loaded in filter.meta

	//game image will be an animated placeholder. only the games in-view will require an image download from the server.

	//clicking on the Info button will ask the CMS for the /game/{ID}/detail
	//the information will be cached by the client (cache expiration time can be configured in the CMS)

	//server endpoints:

	/carousel/categories/
		All the categories/subcategories in the system
		this is used to build up the categories tab list and as a dictionary for all the carousel games requests

	/carousel/
		All the info

	/carousel/{ID}  --> NOT TO BE IMPLEMENTED BY NOW
		game info, extended description etc etc (useful when we press the "I"nfo button)
		the JSON result will be "added" to the game cell requesting it (so I will know which games info have been already loaded from the server)
		So, this will add the "detail" property to the game object

*/
slots.module.GamesCarousel = (function($){

	/*------------------------------
	* privileged functions
	*------------------------------*/

	function renderCategories( meta, into ) {
		var categoriesEl;

		$('div.categories', into).remove();

		$(into).append( [
				"<div class='categories'>",
					"<ul>",
					"</ul>",
				"</div>"
			].join('') );

		categoriesEl = $('div.categories ul', into );

		$(meta.categories).each( function() {
			$(categoriesEl).append( [
					"<li class='cat_" + this.id + "'>",
						"<a href='" + this.id + "'>" + this.name + "</a>",
					"</li>"
				].join('') );
		} );
	}

	function renderSubcategories( meta, into ) {
		var filtersEl;

		$('div.subcategories', into).remove();
		$(into).append( [
				"<div class='subcategories'>",
					"<ul class='filters'>",
					"</ul>",
				"</div>"
			].join('') );

		filtersEl = $('div.subcategories ul.filters', into );

		$(meta.gamesData.subcategories).each( function() {
			var clazz = (meta.gamesData.query.subcategoryId == this.id ? "selected" : "");

			//add subcategory
			filtersEl.append( "<li class='" + clazz + "'><a href='#' class='filter_" + this.id + "'>" + this.name + "</a></li>" );
		} );

		//$('div.subcategories', into ).append( "<div class='filterPopup'></div>" );
	}

	function renderGames( meta, into ) {
		var gamesPerPage = meta.gamesPerPage,
			canvas,
			carouselStrip,
			carouselPager,
			carouselPagerUl,
			canvasPage,
			idx = 0;

		renderSubcategories( meta, into );

		//unselect any category
		$('.categories li.selected', into ).removeClass( 'selected' );
		$( '.categories li.cat_' + meta.gamesData.query.categoryId ).addClass( 'selected' );


		//console.log( typeof data );
		//iterate over games
		//into.empty();
		$( ".carousel-canvas", into ).remove();
		$( ".carousel-pager", into ).remove();
		$( ".page-control", into ).remove();

		slots.events.gameCarousel.Initializing.publish();

		//render games blocks

		if( meta.gamesData && meta.gamesData.games && meta.gamesData.games.length > 0 ) {

			$(into).append( [
						"<div class='page-control prev'>",
							"<div class='shadow'/>",
							"<a href='#' class='prev-small' >Previous page</a>",
						"</div>"
				].join('') );
			$(into).append( [
						"<div class='page-control next'>",
							"<div class='shadow'/>",
							"<a href='#' class='next-small' >Next page</a>",
						"</div>"
				].join('') );

			$(into).append( "<div class='carousel-canvas'></div>" );

			$(into).append( "<div class='carousel-pager'></div>" );

			//$(into).append( "<div class='carousel-pager'></div>" );

			canvas = $( '.carousel-canvas', $(into) );

			canvas.append( "<div class='carousel-strip'></div>" );
			//canvas.append( "<div class='carousel-pager'></div>" );
			carouselStrip = $( '.carousel-strip', canvas );

			//carouselPager = $( '.carousel-pager', canvas );
			carouselPager = $( '.carousel-pager', into );
			carouselPager.append( [
					"<div class='pager-content'>",
						"<ul class='pages'></ul>",
					"</div>"
					].join('') );
			carouselPagerUl = $('ul', carouselPager );

			meta.totPages = parseInt( meta.gamesData.games.length / gamesPerPage, 10 ) + (meta.gamesData.games.length % gamesPerPage ? 1 : 0);

			//initialize meta.pages array for categories creation
			meta.pages = [];
			meta.pagesContainer = carouselStrip;

			//create all the category pages
			//Each category page contains all the metadata necessary for managing its content
			for( idx = 0; idx < meta.totPages; idx++ ) {
				carouselStrip.append( "<div class='canvas-page page_" + idx + "'></div>" );
				canvasPage = $('.canvas-page.page_' + idx, carouselStrip );
				meta.pages.push( {
					el: canvasPage,		//jquery wrapper for the DOM element
					offset: idx * canvasPage.width(),		//offset for animating the sliding in/out
					//TODO: better to use indexes such as from/to to avoid array duplications
					games: meta.gamesData.games.slice( idx * gamesPerPage, (idx * gamesPerPage) + gamesPerPage ),	//actual games for the category
					slots: gamesPerPage		//total slots in the category page
				} );

				carouselPagerUl.append( "<li><a href='#carousel-page_" + idx + "' class='page page_" + idx + "'>page " + (idx+1) + "</a></li>" );
			}

			//set the width of the category pages strip
			carouselStrip.width( meta.pages[0].el.width() * meta.totPages );

			//determine offset
			renderCurrentGamePage( meta );

      //sets carousel-canvas height to the height of the canvas-page
      var canvasPageZero = $('.canvas-page').first()
      $('.carousel-canvas').height(canvasPageZero.height())
      $('.canvas-page').height(canvasPageZero.height())

			//set pager handlers
			$('.page', carouselPager ).unbind( 'click' );
			$('.page', carouselPager ).click( function(evt) {
				var pageIdx = parseInt( $(this).attr('class').match(/page_(.*)/)[1], 10 ),
					x = gamesPerPage*pageIdx;

				evt.preventDefault();

				if( pageIdx !== null ) {
					//set this page as the selected one
					meta.pageNo = pageIdx;
					renderCurrentGamePage( meta );
				}

				return false;
			});

			//set category handlers
			$('.categories li a', into ).unbind( 'click' );
			$('.categories li a', into ).click( function(e) {
				e.stopPropagation();
				e.preventDefault();

				var catId = $(this).attr('href');
				meta.pageNo = 0;
				loadAllGames( catId, into, meta );
				return false;
			});

			//set subcategory handlers
			$('.subcategories li a', into ).unbind( 'click' );
			$('.subcategories li a', into ).click( function(e) {
				e.stopPropagation();
				e.preventDefault();
				//unselect any filter
				$('.subcategories ul.filters li.selected', into ).removeClass( 'selected' );
				$(this).parent( 'li' ).addClass( 'selected' );

				filterGames( $(this).attr('class').match(/filter_(.*)/)[1] );
			});

			$('.page-control a.prev-small').unbind( 'click' );
			$('.page-control a.prev-small').click( function(e) {
				e.preventDefault();
				meta.carousel.prev();
			} );

			$('.page-control a.next-small').unbind( 'click' );
			$('.page-control a.next-small').click( function(e) {
				e.preventDefault();
				meta.carousel.next();
			} );

		}

		//signal game loading ended, so we can remove the loader animation (if any)
		slots.events.gameCarousel.Ready.publish();
	}

	function filterGames( subcategoryId ) {
		//console.log( "filtering on subcategory " + subcategoryId );
		//not yet...
	}

	/**
	* Render the current game page (and the next one) and check for pagination controls
	*/
	function renderCurrentGamePage( meta ) {
		var idx = 0,
			canvasPage = meta.pages[ meta.pageNo ];

		/**
		* Render a specific game page (no scrolling, no pagination control, just render the games into the page)
		*/
		function renderGamePage( canvasPage ) {
			if( !canvasPage ) {
				//safe net, to avoid overflow
				//console.log( "overflow detected. pages.length = " + meta.pages.length + ", pageNo = " + meta.pageNo );
				return;
			}

			//create games elements only if they do not exists yet
			if( canvasPage.el.children('.game').length === 0 ) {

				$(canvasPage.games).each( function( index, val ) {
					canvasPage.el.append( [
						"<div class='game'>",
							"<img src='//placehold.it/169x105.jpg?t=" + this.id + "' />",
							"<label>" + this.name + "</label>",
						"</div>"
						].join('') );
				});
			}
		}

		function highlightNavigation( index ) {
			//console.log( "page index = " + index );
			$('.carousel-pager ul.pages a.page').removeClass( 'selected' );
			$('.carousel-pager ul.pages a.page.page_' + index ).addClass('selected');
		}

		//highlight page navigation icon
		highlightNavigation( meta.carousel.getCurrentPageNumber() );

		renderGamePage( canvasPage );

		//preload next page (if available)
		if( !meta.carousel.isLastPage() ) {
			//preload
			renderGamePage( meta.pages[ meta.carousel.getCurrentPageNumber() + 1]  );
		}
		if( !meta.carousel.isFirstPage() ) {
			renderGamePage( meta.pages[ meta.carousel.getCurrentPageNumber() - 1] );
		}

		//slide Into view (right or left)
		meta.pagesContainer.animate( {
			left: (meta.pages[ meta.pageNo ].offset * -1) + 30
		} );

		//check for first/last page
		if( meta.carousel.isLastPage() ) {
			//hide next
			$('.page-control.next').hide();
		} else {
			$('.page-control.next').show();
		}

		if( meta.carousel.isFirstPage() ) {
			$('.page-control.prev').hide();
		} else {
			$('.page-control.prev').show();
		}
	}

	/**
	* Load Games from Backend by categoryId
	*/
	function loadAllGames( catId, into, meta ) {
		//avoid caching of Ajax requests..
		$.ajax( {
			url: 'api/games/cat_' + catId + '.json?tstamp=' + (new Date()).getTime(),
			dataType: 'json',
			success: function( data ) {
				meta.gamesData = data;
				meta.pageNo = 0;

				//renderCategories( meta, into );
				renderGames( meta, into );
			},
			error: function( data, textStatus, errorThrown ) {
				//console.log( "error = " + errorThrown );
				//console.log( "error" );
			}
		} );
	}

	function loadCategories( into, meta ) {
		$.ajax( {
			url: 'api/games/categories.json?tstamp=' + (new Date()).getTime(),
			dataType: 'json',
			success: function( data ) {
				meta.categories = data.categories;
				renderCategories( meta, into );
				//preselect first category
				loadAllGames( meta.categories[0].id, into, meta );
			}
		} );

	}

	/*------------------------------
	* exposed API
	*------------------------------*/

	return {
		create: function( selector, config ) {

			var _config = {
					preloadNextPagesNr: 1	//how many pages to preload, beside the actual one
				},
				carouselWrapperEl,
				meta = {	//metadata containing all the games infos
					categories: [],		//global categories dictionary
					catId: 0,			//requested category Id
					gamesPerPage: 15,	//this shouldn't be modified at the moment
					gamesData: {},			//games object got from network
					pageNo: 0,			//actual page number
					totPages: 0,		//total pages
					pages: [],			//array of category pages
					pagesContainer: null,	//container for all the pages
					carousel: null			//carousel instance
				};

			//create the carousel
			if( !selector || $(selector).length === 0 ) {
				return null;
			}

			_config = $.extend( _config, config );

			//start it
			carouselWrapperEl = $(selector);

			var carousel = {
				el: carouselWrapperEl,
				getCurrentPageNumber: function(){ return meta.pageNo; },
				next: function() {
					if( meta.pageNo+1 >= meta.totPages ) {
						return;
					}
					meta.pageNo += 1;
					renderCurrentGamePage( meta );

				},
				prev: function() {
					if( meta.pageNo === 0 ) {
						return;
					}
					meta.pageNo -= 1;
					renderCurrentGamePage( meta );
				},
				first: function() {
					meta.pageNo = 0;
					renderCurrentGamePage( meta );
				},
				last: function() {
					meta.pageNo = meta.totPages - 1;
					renderCurrentGamePage( meta );
				},
				isFirstPage: function() {
					return meta.pageNo === 0;
				},
				isLastPage: function() {
					return meta.pageNo+1 === meta.totPages;
				}
			};

			meta.carousel = carousel;
			loadCategories( carouselWrapperEl, meta );
			return carousel;
		}
	};
}(jQuery));
