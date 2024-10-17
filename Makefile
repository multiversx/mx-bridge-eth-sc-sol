tools-install:
	bash ./scripts/tools-install.sh

generate-all:
	cd ./scripts && bash ./generate-all.sh

run-tests:
	cd ./scripts && bash ./tests.sh

run-tests-in-docker:
	@docker compose -f docker/tests-docker-compose.yml build
	@docker compose -f docker/tests-docker-compose.yml up
	@docker compose -f docker/tests-docker-compose.yml down -v
