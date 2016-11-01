#!/bin/bash
:
tot=500
index=1

while [ $index -le $tot ]
do
	`cp game.jpg game-$index.jpg`
	index=`expr $index + 1`;
done