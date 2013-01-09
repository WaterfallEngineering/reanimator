PWD = $(shell pwd)
TEST_REPORTER ?= dot
SERVER_PORT ?= 8080
DRIVER_PORT ?= 23251
TEST_TIMEOUT ?= 8000
TEST_SLOW ?= 2000
NODE_MODULES = $(PWD)/node_modules
SERVER_PID_FILE := $(PWD)/$(shell echo ".test-server-pid.$$RANDOM")
PHANTOM_PID_FILE := $(PWD)/$(shell echo ".phantom-pid.$$RANDOM")

fixture-server:
	@cd tests/fixtures ; \
		$(NODE_MODULES)/.bin/http-server -s -p $(SERVER_PORT) & \
		echo "$$!" > $(SERVER_PID_FILE) ; \
		cd $(PWD)

phantom:
	@phantomjs --webdriver=$(DRIVER_PORT) & \
		echo "$$!" > $(PHANTOM_PID_FILE) ; \
		cd $(PWD)

test: fixture-server phantom
	@export DRIVER_PORT=$(DRIVER_PORT) ; \
		export FIXTURE_PORT=$(SERVER_PORT) ; \
		$(NODE_MODULES)/.bin/mocha tests/test --recursive \
			--globals define \
			--timeout $(TEST_TIMEOUT) --slow $(TEST_SLOW) \
			-R $(TEST_REPORTER) $(TEST_ARGS); \
		STATUS=$$? ; \
		kill -9 `cat $(SERVER_PID_FILE)` ; rm $(SERVER_PID_FILE) ; \
		kill -9 `cat $(PHANTOM_PID_FILE)` ; rm $(PHANTOM_PID_FILE) ; \
		exit $$STATUS

.PHONY: test fixture-server
