class RejectionCodes extends React.Component {
  constructor(props) {
    super(props);
    this.refresh = this.refresh.bind(this);
    this.table = React.createRef();
    this.fetchData = this.fetchData.bind(this);
    this.create_permission = this.props.Permissions.canAccessResource(
      "quality",
      "rejection_code",
      "CREATE"
    );
    this.update_permission = this.props.Permissions.canAccessResource(
      "quality",
      "rejection_code",
      "UPDATE"
    );
    this.delete_permission = this.props.Permissions.canAccessResource(
      "quality",
      "rejection_code",
      "DELETE"
    );
    this.state = { rows: [] };
  }

  refresh() {
    this.table.current.refresh();
  }

  fetchData(pageSize, page, sort, filter) {
    return new Promise((resolve, reject) => {
      let params = {
        page: page,
        per: pageSize
      };

      if (sort.length > 0) {
        sort = sort[0];
        params["order_by"] = sort.id;
        params["order"] = sort.desc ? "desc" : "asc";
      }

      if (filter.length > 0) {
        params["regex_filters"] = [];
        for (let i = 0; i < filter.length; i++) {
          params["regex_filters"].push({
            field: filter[i].id,
            value: filter[i].value
          });
        }
      }

      Mint.get(
        "/api/v1/rejection_codes",
        params,
        (code, result) => {
          resolve({
            rows: result.generic_objects,
            pages: result.total_pages
          });
        },
        (code, errors) => {
          if (errors != null) {
            if (typeof errors === "object") {
              reject(errors.statusText);
            } else {
              reject(errors[0].message);
            }
          } else {
            reject("Unknown error");
          }
        },
        null,
        null
      );
    });
  }

  getPageColumns() {
    return [
      {
        Header: "Code",
        accessor: "code"
      },
      {
        Header: "Name",
        accessor: "name"
      },
      {
        Header: "Description",
        accessor: "description"
      },
      {
        Header: "Actions",
        id: "actions",
        accessor: d => d,
        sortable: false,
        filterable: false,
        maxWidth: 150,
        Cell: row => (
          <div className="actions">
            <RejectionCodeModal
              t={this.props.t}
              afterEvent={this.refresh}
              disabled={!this.update_permission}
              rejectionCodeKey={row.value.generic_object_key}
            />
            <Tooltip title="Delete">
              <span>
                <ObjectDelete
                  objectKey={
                    this.delete_permission
                      ? row.value.generic_object_key
                      : undefined
                  }
                  objectName={row.value.name}
                  objectType={"Rejection Code"}
                  objectUrl="/api/v1/rejection_codes"
                  afterDelete={this.refresh}
                />
              </span>
            </Tooltip>
          </div>
        )
      }
    ];
  }

  formatData(headers, data) {
    console.log(headers);
    console.log(data);
  }

  render() {
    const { pageKey, t } = this.props;
    let actions = null;
    if (this.create_permission) {
      actions = (
        <RejectionCodeModal
          t={t}
          afterEvent={this.refresh}
          disabled={!this.create_permission}
        />
      );
    }
    return (
      <div>
        <ActionBar>
          <GridContainer>
            <GridItem xs={12} sm={12} md={12}>
              <div
                style={{
                  height: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  float: "left"
                }}
              >
                <CustomBreadcrumbs
                  options={[
                    {
                      label: "Home",
                      href: "/"
                    },
                    {
                      label: "Rejection Codes"
                    }
                  ]}
                />
              </div>
              <PullRight>
                <CSVExport
                  fileName="operators.csv"
                  csvColumns={[
                    { title: "Code", accessor: "code" },
                    { title: "Name", accessor: "name" },
                    {
                      title: "Description",
                      accessor: "description"
                    }
                  ]}
                  fetchData={this.fetchData}
                />
                <CSVImport
                  formatData={(h, d) => this.formatData(h, d)}
                  url="/api/v1/functions/bulk_upload_tools/execute"
                  urlParams={{ test_mode: true }}
                />
                <Tooltip title={t("_reload_")}>
                  <span>
                    <IconButton aria-label="Refresh" onClick={this.refresh}>
                      <MaterialIcons.Refresh fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <UpdatePermissions
                  subjectType="rejection_code"
                  subjectKey={"master"}
                  permissionTypes={[
                    "ALL",
                    "READ",
                    "CREATE",
                    "UPDATE",
                    "DELETE"
                  ]}
                />
              </PullRight>
            </GridItem>
          </GridContainer>
        </ActionBar>
        <Card>
          <CardBody>
            <ReactTable.ServerTable
              columns={this.getPageColumns()}
              fetchData={this.fetchData}
              innerRef={this.table}
              filterable
              actions={actions}
            />
          </CardBody>
        </Card>
      </div>
    );
  }
}

class RejectionCodeModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.getDefaultState();
    this.onSave = this.onSave.bind(this);
    this.getFieldValue = this.getFieldValue.bind(this);
    this.setFieldValue = this.setFieldValue.bind(this);
    this.loadRejectionCode = this.loadRejectionCode.bind(this);
    this.validate = this.validate.bind(this);
  }

  loadRejectionCode(props) {
    const { rejectionCodeKey } = this.props;
    if (rejectionCodeKey) {
      Mint.get(
        "/api/v1/rejection_codes/" + rejectionCodeKey,
        {},
        (code, result) => {
          this.setState({
            code: result.generic_object.code,
            name: result.generic_object.name,
            description: result.generic_object.description,
            working: false
          });
        }
      );
    } else {
      this.setState(this.getDefaultState());
    }
  }

  validate() {
    const { code, name, description } = this.state;
    return (
      ValidationUtils.validatePresence(code, "Code") &&
      ValidationUtils.validatePresence(name, "Name") &&
      ValidationUtils.validateSecurity(code, "Code") &&
      ValidationUtils.validateSecurity(name, "Name") &&
      ValidationUtils.validateSecurity(description, "Description")
    );
  }

  getDefaultState() {
    return {
      code: "",
      name: "",
      description: "",
      working: false
    };
  }

  onSave() {
    const { rejectionCodeKey, afterEvent } = this.props;
    return new Promise((resolve, reject) => {
      const params = {
        generic_object: {
          type: "RejectionCode",
          code: this.state.code,
          name: this.state.name,
          description: this.state.description,
          properties: {}
        }
      };

      this.setState({ working: true });
      if (rejectionCodeKey) {
        url = "/api/v1/rejection_codes/" + rejectionCodeKey;
        Mint.put(
          url,
          params,
          (code, result) => {
            Flash.success(
              "Rejection Code " + this.state.name + " updated successfully"
            );
            if (afterEvent) {
              afterEvent();
            }
            resolve(result);
          },
          null,
          null,
          () => {
            this.setState({ working: false });
          }
        );
      } else {
        Mint.post(
          "/api/v1/rejection_codes",
          params,
          (code, result) => {
            Flash.success(
              "Rejection Code " + this.state.name + " created successfully."
            );
            if (afterEvent) {
              afterEvent();
            }
            resolve(result);
          },
          null,
          null,
          () => {
            this.setState({ working: false });
          }
        );
      }
    });
  }

  getFieldValue(field) {
    return this.state[field];
  }

  setFieldValue(field, event) {
    map = {};
    map[field] = event.target != null ? event.target.value : event;
    this.setState(map);
  }

  render() {
    const { t, rejectionCodeKey, disabled } = this.props;
    let title = "Create a Rejection Code";
    const extraProps = {};
    if (rejectionCodeKey) {
      title = `Edit Rejection Code - ${this.state.name}`;
      extraProps.icon = MaterialIcons.Edit;
    } else {
      extraProps.button = <MaterialIcons.Add />;
      extraProps.buttonProps = { variant: "fab", mini: true, color: "primary" };
    }

    return (
      <ButtonModal
        tooltip={title}
        title={title}
        disabled={disabled}
        secondaryBtnLabel={t("_cancel_")}
        primaryBtnLabel={t("_save_")}
        onOpen={this.loadRejectionCode}
        validate={this.validate}
        onPrimaryClick={this.onSave}
        {...extraProps}
      >
        <GridContainer>
          <GridItem xs={12} sm={12} md={3}>
            <CustomInput
              labelText={`Code *`}
              id="code"
              formControlProps={{
                fullWidth: true
              }}
              inputProps={{
                type: "text",
                value: this.getFieldValue("code"),
                onChange: e => {
                  this.setFieldValue("code", e.target.value);
                }
              }}
            />
          </GridItem>
          <GridItem xs={12} sm={12} md={3}>
            <CustomInput
              labelText={`Name *`}
              id="name"
              formControlProps={{
                fullWidth: true
              }}
              inputProps={{
                type: "text",
                value: this.getFieldValue("name"),
                onChange: e => {
                  this.setFieldValue("name", e.target.value);
                }
              }}
            />
          </GridItem>
          <GridItem xs={12} sm={12} md={6}>
            <CustomInput
              labelText={`Description`}
              id="description"
              formControlProps={{
                fullWidth: true
              }}
              inputProps={{
                type: "text",
                value: this.getFieldValue("description"),
                onChange: e => {
                  this.setFieldValue("description", e.target.value);
                }
              }}
            />
          </GridItem>
        </GridContainer>
        <CircularProgress show={this.state.working} />
      </ButtonModal>
    );
  }
}
