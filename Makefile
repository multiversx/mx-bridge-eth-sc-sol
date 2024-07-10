tools-install:
	bash ./scripts/tools-install.sh

generate-all:
	cd ./scripts && bash ./generate-all.sh

run-tests:
	cd ./scripts && bash ./tests.sh
