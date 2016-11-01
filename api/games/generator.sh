#!/bin/bash
:
tot=500
index=1

echo > games.json;

echo '{
	"header": {
		"availableGames": '$tot', 
		"page": 0,
		"pagination": false
	},

	"query": {
	},

	"games":[' >> games.json;

while [ $index -le $tot ]
do
	sep=''

	if [ $index -lt $tot ]
	then
		sep=','
	fi
	echo '	{
		"id": 1200'$index',
		"name": "Games #'$index'",
		"categories": [1,2]
	}' $sep >> games.json
	index=`expr $index + 1`;
done

echo '	],
	"categories": [
		{"id": 1, "name": "Slots"},
		{"id": 2, "name": "New" }
	]
}' >> games.json;