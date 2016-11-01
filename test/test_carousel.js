GamesCarouselTest = AsyncTestCase( "GamesCarouselTest", (function( $ ){
	//local namespace

	//mock ajax calls

	function mockAjax( expected ) {
		if( !$.ajax.mocked ) {
			$.ajax = function( option ) {
				$.ajax.called = true;
				if( typeof option.success === 'function' ) {
					option.success.call( option, $.ajax.expected );
				}
			};
			$.ajax.mocked = true;
		}
		$.ajax.expected = expected;
	}

	function synchMarker() {
		//just a placeholder used to mark the end of an async call
	}

	return {
		setUp: function() {
			$(document.body).append( "<div class='games-carousel'></div>" );
			
			tash.events.require( 'slots.events.gameCarousel.Ready' );

			mockAjax( {"games":[
				{
					"id": 1,
					"name": "Games #1",
					"categories": [1,2]
				}]
			});
		},
		
		tearDown: function() {
			$('div.games-carousel').remove();
		},

		testCarouselAPIExistence: function() {
			//slots.module.GameCarousel.create( '#carousel' );
			assertObject( 'slots.module.GamesCarousel should be an object', slots.module.GamesCarousel );
		},

		testCarouselCreation: function( queue ) {
			//var carousel = slots.module.GamesCarousel.create( '.games-carousel' );
			var carousel;

			queue.call( "waiting for carousel to be ready", function( callback )  {
				var subscriber = callback.add( synchMarker );

				//subscribe for an event, let's say we are interested in loggedIn events
				slots.events.gameCarousel.Ready.subscribe( subscriber );
				carousel = slots.module.GamesCarousel.create( '.games-carousel' );
			});

			queue.call( "verify carousel creation outcome", function( callback ) {
				//we should have something inside the div now...
				//console.log( "callback called. DOM elements found = " + $('.games-carousel').children().length );
				assertEquals( "Theres should be 3 elements inside the carousel div after creation", 3, $('.games-carousel').children().length );
			});

			
		},

		testCarouselShouldExposejQueryEndpoint: function( queue ) {
			var carousel;

			queue.call( "waiting for carousel to be ready", function( callback ) {
				slots.events.gameCarousel.Ready.subscribe( callback.add( synchMarker ) );
				carousel = slots.module.GamesCarousel.create( '.games-carousel' );
			} );

			queue.call( "verify results", function( callback ) {
				assertNotUndefined( "Carousel should have a 'el' jQuery wrapper object", carousel.el );
				assertTrue( "exposed el element must be the same element passed in in the selector", carousel.el.get(0) == $('.games-carousel').get(0) );
			} );
			
		},

		testCarouselShouldHaveGames: function( queue ) {
			//I expect to find at least one or more games inside the carousel
			var carousel;

			queue.call( function( callback ) {
				slots.events.gameCarousel.Ready.subscribe( callback.add( synchMarker ) );
				carousel = slots.module.GamesCarousel.create( '.games-carousel' );
			} );

			queue.call( function( callback ) {
				assertTrue( "There should be at least one game in the carousel", $( '.game', carousel.el ).length > 0 );
			});
		}
	};
	
}( jQuery )) );
