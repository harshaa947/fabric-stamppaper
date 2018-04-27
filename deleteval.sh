docker stop $(docker ps -a | grep hyperledger| tr -s ' '|cut -f1 -d ' ') && docker rm $(docker ps -a | grep hyperledger| tr -s ' '|cut -f1 -d ' ')
docker stop $(docker ps -a | grep dev| tr -s ' '|cut -f1 -d ' ') && docker rm $(docker ps -a | grep dev| tr -s ' '|cut -f1 -d ' ')
#docker stop $(docker ps -aq) && docker rm $(docker ps -aq)
docker rmi $(docker images dev-* -q)
#docker network prune
