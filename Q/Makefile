# Build the Electron app
all: node_modules build_electron

# Install frontend dependencies
node_modules:
	npm install

build_electron:
	npx electron-vite build

# Remove build files and installed dependencies
.PHONY: clean
clean:
	rm -rf node_modules


	