APP_IMAGE=backend_app_1

down:
	sudo docker-compose down --remove-orphans

remove-image:
	sudo docker rmi $(APP_IMAGE)

build:
	sudo docker-compose build --no-cache

up:
	sudo docker-compose up -d

rebuild:
	sudo docker-compose down --remove-orphans
	sudo docker rmi $(APP_IMAGE) || true
	sudo docker-compose up --build -d

publish-backend:
	docker build -t ethicalgopher/gopherbase:latest .
	docker push ethicalgopher/gopherbase:latest

publish-frontend:
	cd Interface && docker build -t ethicalgopher/gopherbase-frontend:latest .
	cd Interface && docker push ethicalgopher/gopherbase-frontend:latest
