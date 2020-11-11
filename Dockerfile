# install OS layer to your dockerfile
FROM centos:7

# Label your dockerfile
LABEL authors="Kevin Hu khu@liveperson.com"

# install node v8 to run environment
RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -
RUN curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install
RUN yum -y install nodejs wget

# install yarn in global mode
RUN npm install -g yarn

# set app folder env variables - as per standard it should follow /liveperson/code/name_of_project
ENV LP_HOME="/liveperson"
ENV APP_CODE="${LP_HOME}/code/gm-sterling-middleware"

# create folder where application will be running
RUN mkdir -p ${APP_CODE}

# change working dir
WORKDIR ${APP_CODE}

# install external dependencies
#COPY package.json ${APP_CODE}

# copy files that are required for the app to work - modify the lines accordingly
COPY . . 

# install your global dependencies
RUN yarn install && yarn cache clean

# start server and provide port that you will expose
EXPOSE 3001
CMD yarn start
