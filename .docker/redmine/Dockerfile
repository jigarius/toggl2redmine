FROM redmine:4.0

ENV TERM=xterm-256color

RUN apt update -qq > /dev/null \
  && apt install -qqy build-essential make vim less > /dev/null

RUN gem install rubocop

CMD ["rails", "server", "-b", "0.0.0.0"]
