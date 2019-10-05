#/bin/bash

# Exit immediately if a command returns non-zero output.
set -e
set +v

# Required env variables must be declared.
echo "TEST_PATH: $TEST_PATH"
echo "PLUGIN_PATH: $PLUGIN_PATH"
echo "PLUGIN_NAME: $PLUGIN_NAME"
echo "REDMINE_VERSION: $REDMINE_VERSION"
echo "RAILS_VERSION: $(rails -v)"

if [[ -z "$TEST_PATH" ]] ||
   [[ -z "$PLUGIN_PATH" ]] ||
   [[ -z "$PLUGIN_NAME" ]] ||
   [[ -z "$REDMINE_VERSION" ]];
then
  echo "Required env variables must be defined."
  exit 1;
fi

# Redmine variables.
export REDMINE_PATH="$TEST_PATH/redmine"
export REDMINE_REPO="git://github.com/redmine/redmine.git"
export RAILS_ENV=test

# Prepare Redmine and "cd" into it.
git clone --branch $REDMINE_VERSION --depth 1 $REDMINE_REPO $REDMINE_PATH
cd $REDMINE_PATH

# Install plugin.
ln -sf $PLUGIN_PATH plugins/$PLUGIN_NAME

# Prepare database.
mv $PLUGIN_PATH/test/travis/database.yml config/
bundle install
bundle exec rake db:migrate
bundle exec rake redmine:plugins:migrate

# Run tests.
bundle exec rake redmine:plugins:test NAME=$PLUGIN_NAME
