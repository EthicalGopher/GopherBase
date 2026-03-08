APP_IMAGE=backend_app_1

down:
	sudo docker-compose down

remove-image:
	sudo docker rmi $(APP_IMAGE)

build:
	sudo docker-compose build --no-cache

up:
	sudo docker-compose up -d

rebuild:
	sudo docker-compose down
	sudo docker rmi $(APP_IMAGE) || true
	sudo docker-compose up --build -d
